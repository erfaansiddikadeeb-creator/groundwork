import { useState } from "react";
import { FileCheck2, Search, Loader2, Sparkles, RotateCcw, AlertTriangle } from "lucide-react";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AdSlot from "../components/AdSlot.jsx";

const SEVERITY_STYLES = {
  high: { bg: "#f6e9e6", border: "#e3b3a6", text: "var(--red)", label: "Worth a close look" },
  medium: { bg: "#f8f1e3", border: "#e3cd9a", text: "#8a6a1e", label: "Worth noting" },
  low: { bg: "#eef3ea", border: "#c3d6b6", text: "#4a6a3a", label: "Minor" },
};

export default function ContractChecker() {
  const [contractText, setContractText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState("");

  const canSubmit = contractText.trim().length > 60 && !loading;

  async function handleCheck() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/contract-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractText }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "Request failed");
      }
      const parsed = await response.json();
      setResult(parsed);
    } catch (e) {
      setError(
        e.message && e.message !== "Request failed"
          ? e.message
          : "Something went wrong reading that. Try again — or trim it if it's very long."
      );
    } finally {
      setLoading(false);
    }
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
      }}
    >
      <style>{`
        .cc-input::placeholder { color: var(--muted); }
        .cc-input:focus { outline: none; border-color: var(--blue) !important; }
        .cc-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(27,36,48,0.25); }
        .cc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cc-copy:hover { background: var(--ink) !important; color: var(--paper) !important; }
        @keyframes ccSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ccFade { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0); } }
        .cc-fade { animation: ccFade 0.4s ease-out; }
      `}</style>

      <SiteHeader />

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
              borderRadius: "2px",
            }}
          >
            <FileCheck2 size={13} /> CONTRACT CHECKER
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "32px",
              margin: 0,
              letterSpacing: "-0.015em",
              color: "var(--ink)",
            }}
          >
            Know what you're actually signing
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "var(--muted)", maxWidth: "580px" }}>
            Paste a freelance agreement, offer letter, NDA, or any contract. Get a plain-English
            read on what it says, and what's worth a second look before you sign.
          </p>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />

      <div
        style={{
          display: "flex",
          minHeight: "560px",
          maxWidth: "1100px",
          margin: "0 auto",
          flexWrap: "wrap",
        }}
      >
        {/* Left: input */}
        <div style={{ flex: 1, minWidth: "320px", padding: "28px 28px 28px 32px" }}>
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
            Paste the contract text
          </label>
          <textarea
            className="cc-input"
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            placeholder="Paste the full contract or agreement text here..."
            style={{
              width: "100%",
              height: "340px",
              padding: "12px 14px",
              borderRadius: "2px",
              border: "1.5px solid var(--line)",
              background: "#fff",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: "13px",
              lineHeight: 1.5,
              resize: "vertical",
              boxSizing: "border-box",
              color: "var(--graphite)",
            }}
          />

          <button
            className="cc-btn"
            onClick={handleCheck}
            disabled={!canSubmit}
            style={{
              marginTop: "16px",
              width: "100%",
              background: "var(--blue)",
              color: "#fff",
              border: "none",
              borderRadius: "2px",
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
                <Loader2 size={16} style={{ animation: "ccSpin 1s linear infinite" }} />
                Reading the fine print...
              </>
            ) : (
              <>
                <Search size={16} />
                Check it
              </>
            )}
          </button>

          {error && <p style={{ color: "var(--blue)", fontSize: "13px", marginTop: "10px" }}>{error}</p>}

          {!canSubmit && !loading && contractText.length > 0 && (
            <p style={{ color: "var(--muted)", fontSize: "12px", marginTop: "10px" }}>
              A bit more text helps give an accurate read — paste the full contract if you can.
            </p>
          )}
        </div>

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
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 500, margin: 0 }}>
                A plain-English breakdown will appear here.
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
              <Loader2 size={24} style={{ animation: "ccSpin 1s linear infinite", marginBottom: "10px" }} />
              <p style={{ fontSize: "13px" }}>Going clause by clause...</p>
            </div>
          )}

          {result && (
            <div className="cc-fade">
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
                  Summary
                </span>
                <button
                  onClick={reset}
                  style={{
                    background: "none",
                    border: "1.5px solid var(--line)",
                    borderRadius: "2px",
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
                className="bracket-panel"
                style={{
                  fontSize: "13.5px",
                  color: "var(--graphite)",
                  background: "#fff",
                  border: "1px solid var(--line-soft)",
                  borderRadius: "2px",
                  padding: "16px 18px",
                  marginBottom: "16px",
                  lineHeight: 1.6,
                }}
              >
                {result.summary}
              </p>

              <p
                style={{
                  fontSize: "13px",
                  color: "var(--graphite)",
                  background: "#fff",
                  border: "1px solid var(--line-soft)",
                  borderLeft: "3px solid var(--amber)",
                  borderRadius: "2px",
                  padding: "10px 12px",
                  marginBottom: "20px",
                  lineHeight: 1.5,
                }}
              >
                {result.fairnessRead}
              </p>

              {result.flags?.length > 0 && (
                <div style={{ marginBottom: "22px" }}>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Flagged clauses
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {result.flags.map((f, i) => {
                      const sv = SEVERITY_STYLES[f.severity] || SEVERITY_STYLES.low;
                      return (
                        <div
                          key={i}
                          style={{
                            background: sv.bg,
                            border: `1px solid ${sv.border}`,
                            borderRadius: "2px",
                            padding: "10px 14px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <AlertTriangle size={13} color={sv.text} />
                            <span style={{ fontSize: "13px", fontWeight: 600, color: sv.text }}>
                              {f.clause}
                            </span>
                            <span
                              style={{
                                marginLeft: "auto",
                                fontSize: "10.5px",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: sv.text,
                                opacity: 0.8,
                              }}
                            >
                              {sv.label}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: "12.5px", color: "#3a352c", lineHeight: 1.5 }}>
                            {f.reason}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {result.keyClauses?.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
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
                      Key clauses
                    </span>
                    <button
                      className="cc-copy"
                      onClick={() =>
                        copyText(
                          "clauses",
                          result.keyClauses.map((c) => `${c.title}: ${c.explanation}`).join("\n")
                        )
                      }
                      style={{
                        background: "var(--paper)",
                        border: "1px solid var(--line)",
                        borderRadius: "2px",
                        padding: "4px 9px",
                        fontSize: "11px",
                        color: "var(--graphite)",
                        cursor: "pointer",
                      }}
                    >
                      {copied === "clauses" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px" }}>
                    {result.keyClauses.map((c, i) => (
                      <li key={i} style={{ fontSize: "13.5px", lineHeight: 1.6, marginBottom: "6px" }}>
                        <strong>{c.title}:</strong> {c.explanation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 500, margin: 0 }}>
                This isn't legal advice — have a lawyer review anything significant before you sign.
              </p>
            </div>
          )}
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />
      <SiteFooter />
    </div>
  );
}
