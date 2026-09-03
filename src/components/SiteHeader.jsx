import { Link, useLocation } from "react-router-dom";

const TOOLS = [
  { path: "/resume-tailor", label: "Resume Tailor" },
  { path: "/contract-checker", label: "Contract Checker" },
];

export default function SiteHeader() {
  const location = useLocation();

  return (
    <div style={{ background: "var(--white)", borderBottom: "1px solid var(--line)" }}>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "16px 32px",
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
            color: "var(--ink)",
          }}
        >
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "8px",
              background: "var(--blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="4" cy="4" r="2.5" fill="#fff" />
              <circle cx="10" cy="4" r="2.5" fill="#fff" fillOpacity="0.55" />
              <circle cx="7" cy="10" r="2.5" fill="#fff" fillOpacity="0.8" />
            </svg>
          </div>
          <span
            className="font-display"
            style={{ fontWeight: 700, fontSize: "16px", letterSpacing: "-0.01em" }}
          >
            Groundwork
          </span>
        </Link>

        <nav style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {TOOLS.map((tool) => {
            const active = location.pathname === tool.path;
            return (
              <Link
                key={tool.path}
                to={tool.path}
                style={{
                  textDecoration: "none",
                  fontSize: "13.5px",
                  color: active ? "var(--blue)" : "var(--muted)",
                  fontWeight: 500,
                  background: active ? "var(--blue-dim)" : "transparent",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--line-soft)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                {tool.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
