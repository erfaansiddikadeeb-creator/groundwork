import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AdSlot from "../components/AdSlot.jsx";

const TOOLS = [
  {
    path: "/resume-tailor",
    tag: "RESUME",
    name: "Resume Tailor",
    description:
      "Paste your resume and a job posting. Get an ATS keyword match score, the exact keywords you're missing, tailored resume bullets, and a cover letter draft.",
    metric: "ATS match %",
  },
  {
    path: "/contract-checker",
    tag: "CONTRACT",
    name: "Contract Checker",
    description:
      "Paste a freelance or employment contract. Get a plain-English breakdown of what it actually says, and a flagged list of clauses worth a second look.",
    metric: "Risk flags",
  },
];

export default function Home() {
  return (
    <div className="font-body" style={{ background: "var(--paper)", color: "var(--graphite)", minHeight: "100%" }}>
      <SiteHeader />

      {/* Hero */}
      <div className="grid-bg" style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "64px 32px 56px" }}>
          <div
            className="font-mono"
            style={{
              display: "inline-block",
              fontSize: "11px",
              letterSpacing: "0.12em",
              color: "var(--blue)",
              background: "var(--blue-dim)",
              padding: "4px 10px",
              borderRadius: "2px",
              marginBottom: "18px",
            }}
          >
            FREE · NO SIGNUP
          </div>
          <h1
            className="font-display"
            style={{
              fontWeight: 700,
              fontSize: "clamp(32px, 5vw, 48px)",
              lineHeight: 1.08,
              margin: "0 0 16px",
              letterSpacing: "-0.02em",
              maxWidth: "680px",
            }}
          >
            Practical tools for the paperwork of life.
          </h1>
          <p style={{ fontSize: "16px", color: "var(--muted)", maxWidth: "520px", lineHeight: 1.6, margin: 0 }}>
            Paste something in. Get a clear, honest read on it back — no account, no
            paywall, no fine print of our own.
          </p>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />

      {/* Tool grid */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 32px 56px" }}>
        <div
          className="font-mono"
          style={{
            fontSize: "11px",
            letterSpacing: "0.12em",
            color: "var(--muted)",
            marginBottom: "18px",
          }}
        >
          {TOOLS.length} TOOLS AVAILABLE
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          {TOOLS.map((tool) => (
            <Link
              key={tool.path}
              to={tool.path}
              className="bracket-panel"
              style={{
                textDecoration: "none",
                color: "inherit",
                background: "var(--white)",
                border: "1px solid var(--line)",
                padding: "26px 24px 22px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                transition: "border-color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--blue)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  className="font-mono"
                  style={{
                    fontSize: "10.5px",
                    letterSpacing: "0.1em",
                    color: "var(--blue)",
                    background: "var(--blue-dim)",
                    padding: "3px 8px",
                    borderRadius: "2px",
                  }}
                >
                  {tool.tag}
                </span>
                <span className="font-mono" style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                  {tool.metric}
                </span>
              </div>
              <h2 className="font-display" style={{ fontWeight: 700, fontSize: "20px", margin: 0 }}>
                {tool.name}
              </h2>
              <p style={{ fontSize: "13.5px", color: "var(--muted)", lineHeight: 1.55, margin: 0, flex: 1 }}>
                {tool.description}
              </p>
              <span
                className="font-mono"
                style={{
                  fontSize: "12px",
                  color: "var(--ink)",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                OPEN TOOL →
              </span>
            </Link>
          ))}

          {/* "more coming" placeholder card, keeps grid from feeling like a dead end */}
          <div
            className="grid-bg"
            style={{
              border: "1px dashed var(--line)",
              padding: "26px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: "6px",
              color: "var(--muted)",
            }}
          >
            <span className="font-mono" style={{ fontSize: "10.5px", letterSpacing: "0.1em" }}>
              IN PROGRESS
            </span>
            <span className="font-display" style={{ fontSize: "16px", fontWeight: 600, color: "var(--graphite)" }}>
              More tools on the way
            </span>
          </div>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />
      <SiteFooter />
    </div>
  );
}
