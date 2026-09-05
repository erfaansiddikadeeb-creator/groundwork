# Fixyorio

A free multi-tool site — practical tools for the paperwork of life. Currently
includes:
- **Resume Tailor** (`/resume-tailor`) — tailored resume bullets, ATS match
  score, missing keywords, cover letter draft.
- **Contract Checker** (`/contract-checker`) — plain-English contract
  summary, flagged clauses, fairness read.

Both are powered by GPT-4o-mini.

## How it's built
- `src/pages/` — one file per page (Home, ResumeTailor, ContractChecker, Privacy)
- `src/components/` — shared header, footer, and ad slot used across all pages
- `api/` — one Vercel serverless function per tool, each holding the OpenAI
  key server-side and doing its own rate limiting
- Routing via `react-router-dom`, client-side, with `vercel.json` handling
  the server-side rewrite so direct links to e.g. `/contract-checker` don't 404

## Deploy it (same process as before)

1. Push this folder to GitHub (use GitHub Desktop — see earlier notes if the
   web uploader gave you folder-structure issues)
2. Import the repo at [vercel.com](https://vercel.com)
3. Add `OPENAI_API_KEY` as an environment variable in Vercel project settings
4. Deploy — Vercel builds and gives you a live URL

## Adding more tools later

To add a third tool:
1. Create `api/your-tool.js` (copy the rate-limiting pattern from
   `resume-tailor.js` or `contract-checker.js`, swap in your own prompt/schema)
2. Create `src/pages/YourTool.jsx` (copy the layout pattern from
   `ContractChecker.jsx` — it's the simpler of the two)
3. Add it to the `TOOLS` array in `src/pages/Home.jsx` and
   `src/components/SiteHeader.jsx`
4. Add a `<Route>` for it in `src/App.jsx`

## Ads (AdSense)

Same as before — two `<AdSlot />` placeholders per page (they're a shared
component now, so updating `src/components/AdSlot.jsx` once updates every
page). See earlier notes on applying to AdSense; a privacy policy page is
now included at `/privacy`, which AdSense typically wants to see before
approving. Update the contact info in `src/pages/Privacy.jsx` with a real
email once you have one for the site.

## Rate limiting

Each tool has its own independent daily limit (5/visitor, 50 global) — so
usage on one tool doesn't eat into the other's budget headroom. Same caveat
as before: in-memory counters reset on Vercel cold starts, fine for now,
swap for Upstash/Vercel KV later if this gets real traffic.

## Custom domain & traffic

Same guidance as before still applies — see the earlier sections on buying
a domain, redirecting the old `.vercel.app` URL, and driving traffic via
Reddit/Product Hunt/LinkedIn/SEO. With multiple tools now, cross-linking
between them (already built into the site nav) helps pageviews per visit,
which is good for both SEO and ad revenue.


## Adding ads (AdSense)

The layout already has two placeholder ad slots — one under the header, one
at the bottom of the page (`<AdSlot />` in `src/App.jsx`). To activate real
ads:

1. Apply at [adsense.google.com](https://adsense.google.com) with your live
   Vercel URL (a custom domain, see below, helps approval odds).
2. Once approved, add the AdSense loader script to `index.html`, inside
   `<head>`:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
   ```
3. Replace the contents of each `AdSlot` div in `src/App.jsx` with your ad
   unit, e.g.:
   ```jsx
   <ins className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot="XXXXXXXXXX"
        data-ad-format="auto"
        data-full-width-responsive="true"></ins>
   ```
   and call `(window.adsbygoogle = window.adsbygoogle || []).push({});` once
   per slot after mount (a small `useEffect` in `App.jsx` handles this).

AdSense generally wants: a real domain, a privacy policy page, and some
actual traffic before approving a brand-new site — a single-tool page with
zero visitors is a common rejection reason. Worth adding a short "How it
works" / "Privacy" page before applying (ask and I'll draft these).

## Custom domain (optional, helps with ad approval + trust)

1. Buy a domain (Namecheap, Porkbun, etc. — ~$10-15/year).
2. In Vercel: Project → Settings → Domains → add your domain, follow the
   DNS instructions Vercel gives you (usually one CNAME or A record).
3. Vercel issues free HTTPS automatically once DNS propagates (~minutes to
   a few hours).

## Getting traffic (the actual bottleneck for ad revenue)

Ad income scales with visitors, not with having ads installed. A brand-new
tool with a handful of testers won't produce meaningful revenue — that
takes real, repeat traffic. A few realistic channels for a tool like this:

- **SEO content**: a blog section ("how to tailor your resume for X role",
  "ATS keyword matching explained") targeting long-tail search terms people
  actually search before/while job hunting.
- **Reddit/communities**: r/jobs, r/resumes, r/careerguidance — share as a
  free tool (not a sales pitch), following each community's self-promo rules.
- **Product Hunt / Indie Hackers**: a launch post for a free tool tends to
  get an initial traffic spike.
- **LinkedIn**: job-search content performs well there, and it's a natural
  audience match.

Expect this to be a slow build — weeks to months to meaningful traffic, not
days.

## Other notes
- The prompt explicitly tells the model not to invent resume details —
  it's instructed to only rephrase/reframe real experience. Still worth a
  human read-through before sending anything out.
- If you want to add a usage cap (so a stranger can't burn through your
  OpenAI credit if this becomes public), the simplest option is adding
  Vercel's built-in rate limiting or a simple IP-based counter in
  `api/tailor.js`.


