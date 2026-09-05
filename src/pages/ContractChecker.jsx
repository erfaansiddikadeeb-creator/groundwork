import { useState, useRef } from "react";
import { FileCheck2, Search, Loader2, Sparkles, RotateCcw, AlertTriangle, Camera, Upload, X } from "lucide-react";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

const SEVERITY_STYLES = {
  high: { bg: "var(--red-dim)", border: "var(--red)", text: "var(--red)", label: "Worth a close look" },
  medium: { bg: "var(--amber-dim)", border: "var(--amber)", text: "var(--amber)", label: "Worth noting" },
  low: { bg: "var(--green-dim)", border: "var(--green)", text: "var(--green)", label: "Minor" },
};

const MAX_PAGES = 6;
// Vercel serverless functions have a hard 4.5MB request body limit on every
// plan. Base64 encoding inflates file size by ~37%, so we compress each
// photo client-side and keep a safety margin under that ceiling.
const TARGET_MAX_DIMENSION = 1600; // px, longest side
const JPEG_QUALITY = 0.72;
const MAX_TOTAL_COMBINED_MB = 2.6; // combined raw size budget, pre-base64

export default function ContractChecker() {
  usePageTitle("Contract Checker — Fixyorio");
  const [contractText, setContractText] = useState("");
  const [images, setImages] = useState([]); // [{ dataUrl, name }]
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState("");

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const canSubmit = (contractText.trim().length > 60 || images.length > 0) && !loading && !compressing;

  function totalImageBytes(list) {
    // roughly estimate raw size from base64 data URL length
    return list.reduce((sum, img) => sum + img.dataUrl.length * 0.75, 0);
  }

  // Resize + re-encode a photo in the browser so it's small enough to send.
  // Document photos compress very well (mostly flat/white background), so
  // this usually gets a multi-megapixel phone photo down to a few hundred KB
  // without making the text unreadable.
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > TARGET_MAX_DIMENSION) {
          height = Math.round((height * TARGET_MAX_DIMENSION) / width);
          width = TARGET_MAX_DIMENSION;
        } else if (height >= width && height > TARGET_MAX_DIMENSION) {
          width = Math.round((width * TARGET_MAX_DIMENSION) / height);
          height = TARGET_MAX_DIMENSION;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; // flatten transparency (e.g. from PNG/HEIC) onto white
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Couldn't process that image."));
      };
      img.src = objectUrl;
    });
  }

  async function addImageFile(file) {
    try {
      const dataUrl = await compressImage(file);
      setImages((prev) => {
        if (prev.length >= MAX_PAGES) {
          setError(`You can add up to ${MAX_PAGES} pages at once.`);
          return prev;
        }
        const next = [...prev, { dataUrl, name: file.name || `page-${prev.length + 1}` }];
        if (totalImageBytes(next) > MAX_TOTAL_COMBINED_MB * 1024 * 1024) {
          setError(
            `That's too many pages combined for this file size limit — try removing one, or splitting into two separate checks.`
          );
          return prev;
        }
        return next;
      });
      setContractText("");
    } catch (e) {
      setError("Couldn't read that image. Try again, or try a different photo.");
    }
  }

  async function handleFilesPicked(fileList) {
    setError("");
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setCompressing(true);
    for (const file of files) {
      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (e) => {
          setContractText(e.target.result || "");
          setImages([]);
        };
        reader.onerror = () => setError("Couldn't read that file. Try pasting the text instead.");
        reader.readAsText(file);
        continue;
      }
      if (file.type.startsWith("image/")) {
        await addImageFile(file);
        continue;
      }
      setError("That file type isn't supported yet — use photos/images, a .txt file, or paste the text directly.");
    }
    setCompressing(false);
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function clearImages() {
    setImages([]);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCheck() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const body = images.length > 0
        ? { imageDataUrls: images.map((img) => img.dataUrl) }
        : { contractText };

      const response = await fetch("/api/contract-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    setImages([]);
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
              borderRadius: "10px",
            }}
          >
            <FileCheck2 size={13} /> CONTRACT CHECKER
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
              marginBottom: "8px",
            }}
          >
            Add the contract{images.length > 0 ? ` — ${images.length} page${images.length > 1 ? "s" : ""}` : ""}
          </label>

          {/* Camera / upload buttons */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => {
                handleFilesPicked(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.txt"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                handleFilesPicked(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={images.length >= MAX_PAGES || compressing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--white)",
                border: "1.5px solid var(--line)",
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "12.5px",
                color: "var(--graphite)",
                cursor: images.length >= MAX_PAGES || compressing ? "not-allowed" : "pointer",
                opacity: images.length >= MAX_PAGES || compressing ? 0.5 : 1,
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              <Camera size={14} /> {images.length > 0 ? "Add another page" : "Take a photo"}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= MAX_PAGES || compressing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--white)",
                border: "1.5px solid var(--line)",
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "12.5px",
                color: "var(--graphite)",
                cursor: images.length >= MAX_PAGES || compressing ? "not-allowed" : "pointer",
                opacity: images.length >= MAX_PAGES || compressing ? 0.5 : 1,
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              <Upload size={14} /> {compressing ? "Processing..." : "Upload file(s)"}
            </button>
          </div>

          {images.length > 0 ? (
            <div
              style={{
                border: "1.5px solid var(--line)",
                borderRadius: "10px",
                padding: "10px",
                marginBottom: "10px",
                background: "var(--white)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                  gap: "8px",
                }}
              >
                {images.map((img, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "var(--overlay-dark)",
                        border: "none",
                        borderRadius: "10px",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#fff",
                      }}
                      aria-label={`Remove page ${i + 1}`}
                    >
                      <X size={11} />
                    </button>
                    <img
                      src={img.dataUrl}
                      alt={`Page ${i + 1}`}
                      style={{
                        width: "100%",
                        height: "110px",
                        objectFit: "cover",
                        display: "block",
                        border: "1px solid var(--line)",
                        borderRadius: "10px",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        bottom: "4px",
                        left: "4px",
                        background: "rgba(20,33,61,0.75)",
                        color: "#fff",
                        fontSize: "10px",
                        padding: "1px 5px",
                        borderRadius: "10px",
                      }}
                    >
                      p{i + 1}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                <p style={{ fontSize: "11.5px", color: "var(--muted)", margin: 0 }}>
                  Read in page order — add each page of the contract, up to {MAX_PAGES}.
                </p>
                <button
                  type="button"
                  onClick={clearImages}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    fontSize: "11.5px",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Clear all
                </button>
              </div>
            </div>
          ) : (
            <textarea
              className="cc-input"
              value={contractText}
              onChange={(e) => setContractText(e.target.value)}
              placeholder="...or paste the full contract or agreement text here"
              style={{
                width: "100%",
                height: "300px",
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
          )}

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

          {error && <p style={{ color: "var(--red)", fontSize: "13px", marginTop: "10px" }}>{error}</p>}

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
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "18px", fontWeight: 500, margin: 0 }}>
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
                className="bracket-panel"
                style={{
                  fontSize: "13.5px",
                  color: "var(--graphite)",
                  background: "var(--white)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: "10px",
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
                  background: "var(--white)",
                  border: "1px solid var(--line-soft)",
                  borderLeft: "3px solid var(--amber)",
                  borderRadius: "10px",
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
                            borderRadius: "10px",
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
                          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--graphite)", lineHeight: 1.5 }}>
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
                        borderRadius: "10px",
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
