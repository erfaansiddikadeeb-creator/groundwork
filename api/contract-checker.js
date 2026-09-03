// Vercel serverless function — runs on the server, keeps your OpenAI key private.
// Set OPENAI_API_KEY in your Vercel project's Environment Variables (same key
// used by resume-tailor.js).

const SYSTEM_PROMPT = `You are an expert contract reviewer helping a non-lawyer understand a contract before they sign it (freelance agreements, employment offers, NDAs, service agreements, leases, etc). You are NOT providing legal advice — you are translating and flagging, so the person can make an informed decision or know what to ask a real lawyer about.

You may receive the contract as plain text, or as a photo/scan of a physical document. If it's an image, read the text in it carefully first. If parts of the image are blurry, cut off, or otherwise unreadable, briefly note that in the summary rather than guessing at or inventing the missing content.

Given the contract, you:
1. Write a plain-English summary (3-5 sentences) of what this contract actually commits the person to.
2. Identify the 4-8 most important clauses (payment terms, termination, IP ownership, non-compete, liability, confidentiality, auto-renewal, etc — whichever are actually present) and explain each in one plain sentence.
3. Flag specific clauses that are worth a second look — unusual, one-sided, vague, or commonly problematic terms (e.g. broad IP assignment, unlimited liability, auto-renewal with short cancellation windows, unusually long non-competes, unclear payment timelines). For each flag, give a severity ("low", "medium", "high") and a plain-English reason. Do not invent flags if the contract is genuinely standard — an empty or short list is a valid, honest result.
4. Give an overall "fairness read" (1-2 sentences) — an honest, balanced take on whether this leans standard/fair or unusually one-sided, without being alarmist.

Always include a brief closing reminder that this is not legal advice and a lawyer should review anything significant before signing — but keep it to one sentence, don't be repetitive about it.

Respond with ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "summary": "<string>",
  "keyClauses": [{"title": "<string>", "explanation": "<string>"}, ...4-8 items],
  "flags": [{"clause": "<string>", "severity": "low"|"medium"|"high", "reason": "<string>"}, ...0-8 items],
  "fairnessRead": "<string>"
}`;

// --- Rate limiting (same pattern as resume-tailor.js) -------------------
const PER_IP_DAILY_LIMIT = 5;
const GLOBAL_DAILY_LIMIT = 50;
const MAX_PAGES_SERVER = 6;

const ipCounts = new Map();
let globalCount = { count: 0, day: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function checkAndIncrementLimits(ip) {
  const day = today();

  if (globalCount.day !== day) globalCount = { count: 0, day };
  if (globalCount.count >= GLOBAL_DAILY_LIMIT) {
    return { ok: false, reason: "This tool has hit its free usage limit for today. Please try again tomorrow." };
  }

  const entry = ipCounts.get(ip);
  if (!entry || entry.day !== day) {
    ipCounts.set(ip, { count: 1, day });
  } else {
    if (entry.count >= PER_IP_DAILY_LIMIT) {
      return { ok: false, reason: `You've reached today's limit of ${PER_IP_DAILY_LIMIT} contract checks. Come back tomorrow!` };
    }
    entry.count += 1;
  }

  globalCount.count += 1;
  return { ok: true };
}
// --------------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const limitCheck = checkAndIncrementLimits(ip);
  if (!limitCheck.ok) {
    res.status(429).json({ error: limitCheck.reason });
    return;
  }

  const { contractText, imageDataUrls } = req.body || {};

  const hasText = contractText && contractText.length >= 40;
  const images = Array.isArray(imageDataUrls)
    ? imageDataUrls.filter((u) => typeof u === "string" && u.startsWith("data:image/"))
    : [];
  const hasImages = images.length > 0;

  if (!hasText && !hasImages) {
    res.status(400).json({ error: "Missing contract text or image(s)." });
    return;
  }

  if (images.length > MAX_PAGES_SERVER) {
    res.status(400).json({ error: `Too many pages — up to ${MAX_PAGES_SERVER} at a time.` });
    return;
  }

  // Vercel serverless functions have a HARD 4.5MB request body limit on
  // every plan — this isn't configurable. Base64-encoded images plus JSON
  // overhead need to stay comfortably under that, or the request fails
  // before this code even runs. The frontend compresses photos before
  // sending, but this is a hard backstop in case that's bypassed.
  const totalImageBytes = images.reduce((sum, u) => sum + u.length, 0);
  if (totalImageBytes > 3.6 * 1024 * 1024) {
    res.status(400).json({ error: "Those photos are too large combined for this to process. Try fewer pages, or a lower-resolution photo." });
    return;
  }

  const userContent = hasImages
    ? [
        {
          type: "text",
          text:
            images.length > 1
              ? `Here are ${images.length} photos of the contract, in page order. Read them carefully as one continuous document and analyze it.`
              : "Here is a photo of the contract. Read it carefully and analyze it.",
        },
        ...images.map((url) => ({ type: "image_url", image_url: { url } })),
      ]
    : `CONTRACT TEXT:\n${contractText}`;

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      res.status(502).json({ error: "OpenAI request failed", detail: errText });
      return;
    }

    const data = await openaiRes.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
}
