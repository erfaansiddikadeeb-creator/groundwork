import { useState } from "react";
import { Scissors, Pin, Loader2, Sparkles, RotateCcw, Wand2 } from "lucide-react";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

const SAMPLE_RESUME = `Sarah Chen
Marketing Coordinator

EXPERIENCE
Marketing Coordinator, Bright Path Media (2022–Present)
- Managed social media content calendar across Instagram, LinkedIn, and TikTok, growing combined followers by 40% in 18 months
- Coordinated email marketing campaigns using Mailchimp, averaging a 22% open rate
- Assisted in planning and executing 3 in-person brand activation events
- Created monthly performance reports using Google Analytics and presented findings to the marketing director

Marketing Intern, Fenwick & Co (2021)
- Supported content creation for company blog, writing 2-3 posts per week
- Helped organize customer feedback surveys and compiled results into summary documents

EDUCATION
B.A. in Communications, State University (2021)

SKILLS
Social media management, Canva, Mailchimp, Google Analytics, basic copywriting, event coordination`;

const SAMPLE_POSTING = `Digital Marketing Specialist — GreenLeaf Home Goods

We're looking for a Digital Marketing Specialist to own our paid and organic social strategy.

Responsibilities:
- Manage paid social campaigns across Meta and TikTok Ads
- Own organic content strategy and posting calendar
- Analyze campaign performance using Google Analytics and Meta Ads Manager, report on ROI
- Collaborate with design team on creative assets
- A/B test ad creative and landing pages

Requirements:
- 2+ years in digital marketing or social media
- Experience with paid social advertising (Meta Ads required)
- Strong analytical skills, comfortable with data/reporting
- Familiarity with SEO and email marketing tools
- Bachelor's degree in Marketing, Communications, or related field`;

export default function TailorApp() {
  usePageTitle("Resume Tailor — Fixyorio");
  const [resume, setResume] = useState("");
  const [posting, setPosting] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState("");

  const canSubmit = resume.trim().length > 40 && posting.trim().length > 40 && !loading;

  async function handleTailor(resumeOverride, postingOverride) {
    const resumeToUse = resumeOverride ?? resume;
    const postingToUse = postingOverride ?? posting;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/resume-tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeToUse, posting: postingToUse }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "Request failed");
      }
      const parsed = await response.json();
      setResult(parsed);
    } catch (e) {
      setError(e.message && e.message !== "Request failed" ? e.message : "Something snagged on that thread. Try again — or trim your inputs if they're very long.");
    } finally {
      setLoading(false);
    }
  }

  function tryExample() {
    setResume(SAMPLE_RESUME);
    setPosting(SAMPLE_POSTING);
    handleTailor(SAMPLE_RESUME, SAMPLE_POSTING);
  }


  function copyText(label, text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch (e) {}
  }

  function reset() {
    setResult(null);
    setError("");
  }

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        background: "var(--paper)",
        color: "var(--graphite)",
        minHeight: "100%",
        padding: "0",
      }}
    >
      <style>{`
        .tailor-input::placeholder { color: var(--muted); }
        .tailor-input:focus { outline: none; border-color: var(--blue) !important; }
        .pin-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(27,36,48,0.25); }
        .pin-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .stitch {
          background-image: repeating-linear-gradient(to bottom, var(--amber) 0, var(--amber) 6px, transparent 6px, transparent 12px);
          width: 2px;
        }
        @keyframes pinDrop {
          0% { transform: translateY(-6px) rotate(-8deg); opacity: 0; }
          60% { transform: translateY(2px) rotate(4deg); opacity: 1; }
          100% { transform: translateY(0) rotate(0deg); opacity: 1; }
        }
        .pin-anim { animation: pinDrop 0.5s ease-out; }
        .copy-btn { transition: background 0.15s ease; }
        .copy-btn:hover { background: var(--ink) !important; color: var(--paper) !important; }
        @media (prefers-reduced-motion: reduce) {
          .pin-anim { animation: none; }
        }
      `}</style>

      {/* Site nav */}
      <SiteHeader />

      {/* Tool hero */}
      <div className="grid-bg" style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "36px 32px 28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              color: "var(--blue)",
              background: "var(--blue-dim)",
              padding: "4px 10px",
              borderRadius: "10px",
            }}
          >
            <Scissors size={13} /> THE FITTING ROOM
          </div>
          <h1
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "32px",
              margin: 0,
              letterSpacing: "-0.015em",
              color: "var(--ink)",
            }}
          >
            Tailor your application to the role
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "var(--muted)", maxWidth: "560px" }}>
            Paste your resume and the job posting. We'll take the measurements and pin your
            experience to what they're actually asking for.
          </p>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />

      {/* Body */}
      <div
        style={{
          display: "flex",
          minHeight: "560px",
          maxWidth: "1100px",
          margin: "0 auto",
          flexWrap: "wrap",
        }}
      >
        {/* Left: inputs */}
        <div style={{ flex: 1, minWidth: "320px", padding: "28px 28px 28px 32px" }}>
          <button
            type="button"
            onClick={tryExample}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              background: "var(--amber-dim)",
              border: "1px solid var(--amber)",
              borderRadius: "10px",
              padding: "9px 14px",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--amber)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              marginBottom: "18px",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Wand2 size={14} /> Not sure? Try an example — see a real result in seconds
          </button>

          <label
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              display: "block",
              marginBottom: "6px",
            }}
          >
            01 — Your resume
          </label>
          <textarea
            className="tailor-input"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume text here..."
            style={{
              width: "100%",
              height: "150px",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1.5px solid var(--line)",
              background: "var(--white)",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: "13px",
              lineHeight: 1.5,
              resize: "vertical",
              boxSizing: "border-box",
              color: "var(--graphite)",
            }}
          />

          <label
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              display: "block",
              margin: "18px 0 6px",
            }}
          >
            02 — The job posting
          </label>
          <textarea
            className="tailor-input"
            value={posting}
            onChange={(e) => setPosting(e.target.value)}
            placeholder="Paste the job description here..."
            style={{
              width: "100%",
              height: "150px",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1.5px solid var(--line)",
              background: "var(--white)",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: "13px",
              lineHeight: 1.5,
              resize: "vertical",
              boxSizing: "border-box",
              color: "var(--graphite)",
            }}
          />

          <button
            className="pin-btn"
            onClick={() => handleTailor()}
            disabled={!canSubmit}
            style={{
              marginTop: "20px",
              width: "100%",
              background: "var(--blue)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "13px 18px",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                Pinning the pattern...
              </>
            ) : (
              <>
                <Pin size={16} />
                Tailor it
              </>
            )}
          </button>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

          {error && (
            <p style={{ color: "var(--red)", fontSize: "13px", marginTop: "10px" }}>{error}</p>
          )}

          {!canSubmit && !loading && (resume.length > 0 || posting.length > 0) && (
            <p style={{ color: "var(--muted)", fontSize: "12px", marginTop: "10px" }}>
              A little more detail in both fields helps us take an accurate measurement.
            </p>
          )}
        </div>

        {/* Stitched divider */}
        <div className="stitch" style={{ margin: "28px 0" }} />

        {/* Right: output */}
        <div style={{ flex: 1, minWidth: "320px", padding: "28px 32px 28px 28px" }}>
          {!result && !loading && (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                color: "var(--muted)",
                padding: "40px 20px",
              }}
            >
              <Sparkles size={28} strokeWidth={1.5} style={{ marginBottom: "12px" }} />
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "18px", fontWeight: 500, margin: 0 }}>
                Your tailored bullets and cover letter will appear here.
              </p>
            </div>
          )}

          {loading && (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted)",
              }}
            >
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite", marginBottom: "10px" }} />
              <p style={{ fontSize: "13px" }}>Measuring your experience against the role...</p>
            </div>
          )}

          {result && (
            <div className="pin-anim">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    Fit
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "36px",
                        fontWeight: 600,
                        color: "var(--ink)",
                      }}
                    >
                      {result.fitScore}
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: "13px" }}>/ 100</span>
                  </div>
                </div>
                <button
                  onClick={reset}
                  style={{
                    background: "none",
                    border: "1.5px solid var(--line)",
                    borderRadius: "10px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    color: "var(--muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <RotateCcw size={12} /> Start over
                </button>
              </div>

              <p
                style={{
                  fontSize: "13px",
                  color: "var(--graphite)",
                  background: "var(--white)",
                  border: "1px solid var(--line-soft)",
                  borderLeft: "3px solid var(--amber)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  marginBottom: "20px",
                  lineHeight: 1.5,
                }}
              >
                {result.fitNote}
              </p>

              <div
                className="bracket-panel"
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: "10px",
                  padding: "16px 18px",
                  marginBottom: "22px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    ATS keyword match
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: "20px",
                      color:
                        result.atsScore >= 70
                          ? "var(--green)"
                          : result.atsScore >= 40
                          ? "var(--amber)"
                          : "var(--red)",
                    }}
                  >
                    {result.atsScore}%
                  </span>
                </div>

                <div
                  style={{
                    height: "6px",
                    borderRadius: "3px",
                    background: "var(--paper)",
                    overflow: "hidden",
                    marginBottom: result.missingKeywords?.length ? "12px" : "0",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${result.atsScore}%`,
                      borderRadius: "3px",
                      background:
                        result.atsScore >= 70
                          ? "var(--green)"
                          : result.atsScore >= 40
                          ? "var(--amber)"
                          : "var(--red)",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>

                {result.missingKeywords?.length > 0 && (
                  <>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "10.5px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                        display: "block",
                        marginBottom: "7px",
                      }}
                    >
                      Missing keywords
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {result.missingKeywords.map((kw, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: "12px",
                            padding: "3px 9px",
                            borderRadius: "10px",
                            background: "var(--red-dim)",
                            border: "1px solid var(--red)",
                            color: "var(--red)",
                          }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginBottom: "22px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    Tailored bullets
                  </span>
                  <button
                    className="copy-btn"
                    onClick={() => copyText("bullets", result.tailoredBullets.map((b) => `• ${b}`).join("\n"))}
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      borderRadius: "10px",
                      padding: "4px 9px",
                      fontSize: "11px",
                      color: "var(--graphite)",
                      cursor: "pointer",
                    }}
                  >
                    {copied === "bullets" ? "Copied" : "Copy"}
                  </button>
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--muted)",
                    margin: "0 0 10px",
                    lineHeight: 1.5,
                  }}
                >
                  Copy these into your actual resume file, replacing the matching bullets under
                  that job — this tool doesn't edit your resume document for you.
                </p>
                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                  {result.tailoredBullets.map((b, i) => (
                    <li key={i} style={{ fontSize: "13.5px", lineHeight: 1.6, marginBottom: "6px", color: "var(--graphite)" }}>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    Cover letter
                  </span>
                  <button
                    className="copy-btn"
                    onClick={() => copyText("letter", result.coverLetter)}
                    style={{
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                      borderRadius: "10px",
                      padding: "4px 9px",
                      fontSize: "11px",
                      color: "var(--graphite)",
                      cursor: "pointer",
                    }}
                  >
                    {copied === "letter" ? "Copied" : "Copy"}
                  </button>
                </div>
                <div
                  style={{
                    background: "var(--white)",
                    border: "1px solid var(--line-soft)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    fontSize: "13.5px",
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                    color: "var(--graphite)",
                  }}
                >
                  {result.coverLetter}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />
      <SiteFooter />
    </div>
  );
}
