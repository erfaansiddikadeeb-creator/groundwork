// Vercel serverless function — runs on the server, keeps your OpenAI key private.
// Set OPENAI_API_KEY in your Vercel project's Environment Variables.

const SYSTEM_PROMPT = `You are an expert resume tailor, ATS (applicant tracking system) analyst, and cover letter writer. Given a resume and a job posting, you:
1. Identify the 4-6 most important skills/requirements from the job posting.
2. Rewrite or select 4-6 resume bullet points, tailored to emphasize alignment with those requirements, using the candidate's REAL experience only — never invent accomplishments, employers, titles, or numbers that aren't implied by the original resume.
3. Write a concise, specific, non-generic cover letter (3 short paragraphs) in the candidate's voice, referencing the actual company/role where possible.
4. Give a 1-2 sentence "fit note" — an honest, direct assessment of how strong the match is and any real gaps.
5. Compute an ATS match score: estimate what % of the job posting's important keywords/skills/tools/qualifications actually appear (or are clearly implied) in the resume, the way an applicant tracking system would scan for keyword overlap. Be realistic, not generous — a resume missing several named tools or required qualifications should score lower.
6. List the specific important keywords/skills/tools from the posting that are MISSING from the resume — these are the exact terms the candidate should consider adding if truthful, or address in their cover letter if not.

Respond with ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "fitScore": <integer 0-100>,
  "fitNote": "<string>",
  "keyRequirements": ["<string>", ...up to 6],
  "tailoredBullets": ["<string>", ...4-6],
  "coverLetter": "<string with \\n\\n between paragraphs>",
  "atsScore": <integer 0-100>,
  "missingKeywords": ["<string>", ...up to 8, empty array if none]
}`;

// --- Rate limiting -----------------------------------------------------
// NOTE: this is an in-memory counter. Vercel serverless functions can spin
// up fresh instances (cold starts), so this resets sometimes and isn't
// perfectly accurate under real scale. It's enough to stop casual abuse
// and cap worst-case cost while you're getting started. For a bulletproof
// version later, swap this for Vercel KV / Upstash Redis (free tier) —
// same logic, just backed by a shared store instead of a local Map.

const PER_IP_DAILY_LIMIT = 5;   // generous for a real person trying the tool
const GLOBAL_DAILY_LIMIT = 50;  // hard ceiling on total daily spend

const ipCounts = new Map();     // ip -> { count, day }
let globalCount = { count: 0, day: null };

function today() {
  return new Date().toISOString().slice(0, 10); // "2026-08-17"
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
      return { ok: false, reason: `You've reached today's limit of ${PER_IP_DAILY_LIMIT} tailored applications. Come back tomorrow!` };
    }
    entry.count += 1;
  }

  globalCount.count += 1;
  return { ok: true };
}
// ------------------------------------------------------------------------

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

  const { resume, posting } = req.body || {};
  if (!resume || !posting || resume.length < 20 || posting.length < 20) {
    res.status(400).json({ error: "Missing or too-short resume/posting text." });
    return;
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `RESUME:\n${resume}\n\nJOB POSTING:\n${posting}` },
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
