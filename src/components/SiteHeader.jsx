import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sun, Moon, ChevronDown } from "lucide-react";
import { useTheme } from "../hooks/useTheme.js";

const TOOL_GROUPS = [
  {
    label: "Career",
    tools: [
      { path: "/resume-tailor", label: "Resume Tailor" },
      { path: "/contract-checker", label: "Contract Checker" },
    ],
  },
  {
    label: "Finance",
    tools: [
      { path: "/growth-tracker", label: "Growth Tracker" },
      { path: "/salary-vs-contract", label: "Salary vs Contract" },
      { path: "/rate-calculator", label: "Rate Calculator" },
      { path: "/quarterly-tax", label: "Quarterly Tax" },
    ],
  },
  {
    label: "Files",
    tools: [
      { path: "/metadata-remover", label: "Metadata Remover" },
      { path: "/image-converter", label: "Image Converter" },
    ],
  },
];

const ALL_TOOLS = TOOL_GROUPS.flatMap((g) => g.tools);

export default function SiteHeader() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const activeTool = ALL_TOOLS.find((t) => t.path === location.pathname);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ background: "var(--white)", borderBottom: "1px solid var(--line)", position: "relative", zIndex: 20 }}>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <Link
          to="/"
          style={{ display: "flex", alignItems: "center", gap: "9px", textDecoration: "none", color: "var(--ink)" }}
        >
          <div
            style={{
              width: "26px", height: "26px", borderRadius: "8px", background: "var(--blue)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="4" cy="4" r="2.5" fill="#fff" />
              <circle cx="10" cy="4" r="2.5" fill="#fff" fillOpacity="0.55" />
              <circle cx="7" cy="10" r="2.5" fill="#fff" fillOpacity="0.8" />
            </svg>
          </div>
          <span className="font-display" style={{ fontWeight: 700, fontSize: "16px", letterSpacing: "-0.01em" }}>
            Fixyorio
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setOpen((o) => !o)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: open ? "var(--line-soft)" : "transparent",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "13.5px",
                fontWeight: 600,
                color: "var(--ink)",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {activeTool ? activeTool.label : "Tools"}
              <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
            </button>

            {open && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "var(--white)",
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  boxShadow: "0 12px 32px -12px rgba(0,0,0,0.25)",
                  padding: "10px",
                  width: "480px",
                  maxWidth: "calc(100vw - 32px)",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "4px",
                }}
              >
                {TOOL_GROUPS.map((group) => (
                  <div key={group.label} style={{ padding: "6px" }}>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                        padding: "2px 8px 6px",
                      }}
                    >
                      {group.label}
                    </div>
                    {group.tools.map((tool) => {
                      const active = location.pathname === tool.path;
                      return (
                        <Link
                          key={tool.path}
                          to={tool.path}
                          style={{
                            display: "block",
                            textDecoration: "none",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: active ? "var(--blue)" : "var(--graphite)",
                            background: active ? "var(--blue-dim)" : "transparent",
                            padding: "7px 8px",
                            borderRadius: "6px",
                            marginBottom: "2px",
                          }}
                          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--line-soft)"; }}
                          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                        >
                          {tool.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              width: "34px", height: "34px", borderRadius: "8px", border: "1px solid var(--line)",
              background: "transparent", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--muted)", flexShrink: 0,
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--line-soft)"; e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
