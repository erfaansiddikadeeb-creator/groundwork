import { Link, useLocation } from "react-router-dom";

const TOOLS = [
  { path: "/resume-tailor", label: "Resume Tailor" },
  { path: "/contract-checker", label: "Contract Checker" },
];

export default function SiteHeader() {
  const location = useLocation();

  return (
    <div style={{ background: "var(--ink)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "18px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            textDecoration: "none",
            color: "var(--paper)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="1" width="6" height="6" stroke="var(--blue)" strokeWidth="1.5" />
            <rect x="13" y="1" width="6" height="6" stroke="var(--blue)" strokeWidth="1.5" />
            <rect x="1" y="13" width="6" height="6" stroke="var(--blue)" strokeWidth="1.5" />
            <rect x="13" y="13" width="6" height="6" fill="var(--blue)" />
          </svg>
          <span
            className="font-display"
            style={{ fontWeight: 700, fontSize: "17px", letterSpacing: "-0.01em" }}
          >
            Groundwork
          </span>
        </Link>

        <nav style={{ display: "flex", gap: "22px", flexWrap: "wrap" }}>
          {TOOLS.map((tool) => {
            const active = location.pathname === tool.path;
            return (
              <Link
                key={tool.path}
                to={tool.path}
                className="font-mono"
                style={{
                  textDecoration: "none",
                  fontSize: "12px",
                  letterSpacing: "0.03em",
                  color: active ? "var(--blue)" : "#B7BFCC",
                  fontWeight: 500,
                  borderBottom: active ? "2px solid var(--blue)" : "2px solid transparent",
                  paddingBottom: "3px",
                  transition: "color 0.15s ease",
                }}
              >
                {tool.label.toUpperCase()}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
