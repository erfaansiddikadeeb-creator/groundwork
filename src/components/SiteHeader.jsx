import { Link, useLocation } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../hooks/useTheme.js";

const TOOLS = [
  { path: "/resume-tailor", label: "Resume Tailor" },
  { path: "/contract-checker", label: "Contract Checker" },
  { path: "/growth-tracker", label: "Growth Tracker" },
  { path: "/salary-vs-contract", label: "Salary vs Contract" },
  { path: "/rate-calculator", label: "Rate Calculator" },
  { path: "/quarterly-tax", label: "Quarterly Tax" },
];

export default function SiteHeader() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

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
              flexShrink: 0,
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

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <nav style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {TOOLS.map((tool) => {
              const active = location.pathname === tool.path;
              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  style={{
                    textDecoration: "none",
                    fontSize: "13px",
                    color: active ? "var(--blue)" : "var(--muted)",
                    fontWeight: 500,
                    background: active ? "var(--blue-dim)" : "transparent",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    transition: "background 0.15s ease, color 0.15s ease",
                    whiteSpace: "nowrap",
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

          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--muted)",
              flexShrink: 0,
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--line-soft)";
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
