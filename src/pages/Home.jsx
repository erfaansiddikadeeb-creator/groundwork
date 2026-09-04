import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

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
      "Paste, upload, or photograph a freelance or employment contract. Get a plain-English breakdown of what it actually says, and a flagged list of clauses worth a second look.",
    metric: "Risk flags",
  },
  {
    path: "/growth-tracker",
    tag: "FINANCE",
    name: "Growth Tracker",
    description:
      "Model compound growth on savings or investments — adjust starting amount, monthly contribution, rate, and time horizon, and save scenarios to compare later.",
    metric: "Live projection",
  },
  {
    path: "/salary-vs-contract",
    tag: "FINANCE",
    name: "Salary vs Contract",
    description:
      "A salary and a contract rate aren't directly comparable. Weigh both down to what actually lands in your pocket per year, benefits and self-funded costs included.",
    metric: "True value",
  },
  {
    path: "/rate-calculator",
    tag: "FINANCE",
    name: "Rate Calculator",
    description:
      "Work backward from the take-home income you actually want to the hourly and day rate you need to charge — after tax, after expenses, after unbillable time.",
    metric: "Min. rate",
  },
  {
    path: "/quarterly-tax",
    tag: "FINANCE",
    name: "Quarterly Tax",
    description:
      "Self-employment income isn't withheld automatically. Split your estimated tax bill into the standard quarterly due dates so you're never caught off guard.",
    metric: "Per-quarter due",
  },
];

export default function Home() {
  usePageTitle("Groundwork — free tools for the paperwork of life");
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
              borderRadius: "10px",
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
                transition: "box-shadow 0.18s ease, transform 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(25,25,25,0.05), 0 10px 24px rgba(25,25,25,0.08)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "";
                e.currentTarget.style.transform = "translateY(0)";
              }}
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
                    borderRadius: "10px",
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
            style={{
              border: "1.5px dashed var(--line)",
              borderRadius: "12px",
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
