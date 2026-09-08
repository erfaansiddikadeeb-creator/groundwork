import { useState, useEffect, useCallback } from "react";
import { Images, Download, RotateCcw } from "lucide-react";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

/* ---------------------------------------------------------
   Pure helpers — decode any supported image format
--------------------------------------------------------- */

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}

function readString(view, offset, length) {
  let s = "";
  for (let i = 0; i < length; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

function parseTiffOrientation(view, tiffStart) {
  try {
    const little = view.getUint16(tiffStart, false) === 0x4949;
    const get16 = (o) => view.getUint16(o, little);
    const get32 = (o) => view.getUint32(o, little);
    const ifd0Offset = get32(tiffStart + 4);
    const ifdStart = tiffStart + ifd0Offset;
    const count = get16(ifdStart);
    for (let i = 0; i < count; i++) {
      const entry = ifdStart + 2 + i * 12;
      if (get16(entry) === 0x0112) return get16(entry + 8);
    }
  } catch (e) {}
  return 1;
}

function parseJpegOrientation(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return 1;
  let offset = 2;
  const len = view.byteLength;
  while (offset < len - 4) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xe1) {
      const segStart = offset + 4;
      if (readString(view, segStart, 4) === "Exif") {
        return parseTiffOrientation(view, segStart + 6);
      }
      offset += 2 + view.getUint16(offset + 2, false);
    } else if (marker === 0xd9 || marker === 0xda) {
      break;
    } else {
      offset += 2 + view.getUint16(offset + 2, false);
    }
  }
  return 1;
}

function orientCanvas(source, w, h, orientation) {
  const canvas = document.createElement("canvas");
  const swap = orientation >= 5 && orientation <= 8;
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext("2d");
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, h, w); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
    default: break;
  }
  ctx.drawImage(source, 0, 0, w, h);
  return canvas;
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This browser could not decode that file as an image."));
    img.src = URL.createObjectURL(blob);
  });
}

function detectKind(file) {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif")) return "heic";
  if (type === "image/tiff" || name.endsWith(".tif") || name.endsWith(".tiff")) return "tiff";
  return "standard";
}

function labelForKind(kind, mimeType) {
  if (kind === "heic") return "HEIC/HEIF";
  if (kind === "tiff") return "TIFF";
  if (mimeType === "image/jpeg") return "JPEG";
  if (mimeType === "image/png") return "PNG";
  if (mimeType === "image/webp") return "WebP";
  return "Unknown";
}

async function loadAnyImage(file) {
  const kind = detectKind(file);

  if (kind === "heic") {
    if (typeof window.heic2any === "undefined") {
      throw new Error("The HEIC decoder library didn't load — check your connection and try again.");
    }
    const converted = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
    const img = await blobToImage(jpegBlob);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    return { canvas, kind };
  }

  if (kind === "tiff") {
    if (typeof window.UTIF === "undefined") {
      throw new Error("The TIFF decoder library didn't load — check your connection and try again.");
    }
    const buffer = await file.arrayBuffer();
    const ifds = window.UTIF.decode(buffer);
    window.UTIF.decodeImage(buffer, ifds[0]);
    const rgba = window.UTIF.toRGBA8(ifds[0]);
    const w = ifds[0].width, h = ifds[0].height;
    const rawCanvas = document.createElement("canvas");
    rawCanvas.width = w;
    rawCanvas.height = h;
    const rctx = rawCanvas.getContext("2d");
    const imageData = rctx.createImageData(w, h);
    imageData.data.set(rgba);
    rctx.putImageData(imageData, 0, 0);
    let orientation = 1;
    try { orientation = parseTiffOrientation(new DataView(buffer), 0); } catch (e) {}
    const canvas = orientation !== 1 ? orientCanvas(rawCanvas, w, h, orientation) : rawCanvas;
    return { canvas, kind };
  }

  const img = await blobToImage(file);
  let orientation = 1;
  const looksJpeg = file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name || "");
  if (looksJpeg) {
    try {
      const buffer = await file.arrayBuffer();
      orientation = parseJpegOrientation(buffer);
    } catch (e) {}
  }
  const canvas = orientCanvas(img, img.naturalWidth, img.naturalHeight, orientation);
  return { canvas, kind };
}

// Given a source canvas and a target W:H ratio, compute the largest centered
// crop matching that ratio. Pass null ratio for "no crop, keep original."
function cropToRatio(sourceCanvas, ratioW, ratioH) {
  const w = sourceCanvas.width, h = sourceCanvas.height;
  if (!ratioW || !ratioH) return { x: 0, y: 0, w, h };
  const targetRatio = ratioW / ratioH;
  const currentRatio = w / h;
  if (Math.abs(currentRatio - targetRatio) < 0.002) return { x: 0, y: 0, w, h };
  if (currentRatio > targetRatio) {
    const newW = Math.round(h * targetRatio);
    return { x: Math.round((w - newW) / 2), y: 0, w: newW, h };
  }
  const newH = Math.round(w / targetRatio);
  return { x: 0, y: Math.round((h - newH) / 2), w, h: newH };
}

/* ---------------------------------------------------------
   UI bits
--------------------------------------------------------- */

const RATIOS = [
  { key: "original", label: "Original", w: null, h: null },
  { key: "square", label: "Square · 1:1", w: 1, h: 1 },
  { key: "portrait", label: "Portrait · 4:5", w: 4, h: 5 },
  { key: "landscape", label: "Landscape · 16:9", w: 16, h: 9 },
  { key: "standard", label: "Standard · 4:3", w: 4, h: 3 },
  { key: "story", label: "Story/Reel · 9:16", w: 9, h: 16 },
  { key: "custom", label: "Custom", w: null, h: null },
];

const FORMATS = [
  { value: "image/jpeg", label: "JPG", hint: "smaller, no transparency" },
  { value: "image/png", label: "PNG", hint: "lossless, supports transparency" },
  { value: "image/webp", label: "WebP", hint: "smaller, supports transparency" },
];

function Dropzone({ onFile, title, hint, accept }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onClick={() => document.getElementById("conv-input")?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      style={{
        border: `1.5px dashed ${dragging ? "var(--blue)" : "var(--line)"}`,
        borderRadius: "12px",
        padding: "34px 20px",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "var(--blue-dim)" : "var(--paper)",
        transition: "border-color 0.15s ease, background 0.15s ease",
      }}
    >
      <input
        id="conv-input"
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ""; }}
      />
      <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--ink)" }}>{title}</div>
      <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>{hint}</div>
    </div>
  );
}

function StatusBanner({ status }) {
  if (!status || !status.text) return null;
  const isWarn = status.type === "warn";
  return (
    <div
      style={{
        marginTop: "16px", padding: "12px 14px", borderRadius: "10px", fontSize: "13.5px", lineHeight: 1.5,
        background: isWarn ? "var(--red-dim)" : "var(--green-dim)",
        color: isWarn ? "var(--red)" : "var(--green)",
        border: `1px solid ${isWarn ? "var(--red)" : "var(--green)"}`,
      }}
    >
      {status.text}
    </div>
  );
}

function PreviewFigure({ src, label, size }) {
  return (
    <figure style={{ flex: "1 1 200px", margin: 0, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
      <img src={src} alt={label} style={{ maxWidth: "100%", maxHeight: "180px", borderRadius: "6px" }} />
      <figcaption style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>
        {label} · <b style={{ color: "var(--ink)" }}>{size}</b>
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------
   Page
--------------------------------------------------------- */

export default function ImageConverter() {
  usePageTitle(
    "Image Converter — Fixyorio",
    "Free image converter. Convert between JPG, PNG, and WebP — including HEIC and TIFF — and crop to common aspect ratios or a custom one. Runs in your browser."
  );

  const [file, setFile] = useState(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [canvas, setCanvas] = useState(null);
  const [format, setFormat] = useState("image/jpeg");
  const [quality, setQuality] = useState(85);
  const [ratioKey, setRatioKey] = useState("original");
  const [customW, setCustomW] = useState(1);
  const [customH, setCustomH] = useState(1);
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [beforeSize, setBeforeSize] = useState("");
  const [afterUrl, setAfterUrl] = useState(null);
  const [afterSize, setAfterSize] = useState("");
  const [afterDims, setAfterDims] = useState("");
  const [outputBlob, setOutputBlob] = useState(null);
  const [status, setStatus] = useState(null);

  const activeRatio = RATIOS.find((r) => r.key === ratioKey);
  const ratioW = ratioKey === "custom" ? customW : activeRatio?.w;
  const ratioH = ratioKey === "custom" ? customH : activeRatio?.h;

  const runConversion = useCallback((sourceCanvas, fmt, q, rW, rH, originalSize) => {
    if (!sourceCanvas) return;
    const crop = cropToRatio(sourceCanvas, rW, rH);
    const out = document.createElement("canvas");
    out.width = crop.w;
    out.height = crop.h;
    const ctx = out.getContext("2d");
    if (fmt === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.drawImage(sourceCanvas, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
    out.toBlob((blob) => {
      if (!blob) {
        setStatus({ type: "warn", text: "This browser could not encode that format." });
        return;
      }
      setOutputBlob(blob);
      setAfterUrl(URL.createObjectURL(blob));
      setAfterSize(fmtBytes(blob.size));
      setAfterDims(`${out.width}×${out.height}px`);
      const delta = originalSize ? Math.round((1 - blob.size / originalSize) * 100) : 0;
      setStatus({ type: "ok", text: delta > 0 ? `Converted — about ${delta}% smaller than the original.` : "Converted and ready to download." });
    }, fmt, q / 100);
  }, []);

  useEffect(() => {
    if (canvas) runConversion(canvas, format, quality, ratioW, ratioH, file?.size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, format, quality, ratioW, ratioH]);

  function reset() {
    setFile(null); setCanvas(null); setSourceLabel("");
    setBeforeUrl(null); setAfterUrl(null); setAfterDims("");
    setBeforeSize(""); setAfterSize(""); setOutputBlob(null); setStatus(null);
    setRatioKey("original"); setFormat("image/jpeg"); setQuality(85);
  }

  async function handleFile(f) {
    reset();
    setFile(f);
    try {
      const { canvas: c, kind } = await loadAnyImage(f);
      setCanvas(c);
      setSourceLabel(labelForKind(kind, f.type));
      setBeforeUrl(kind === "standard" ? URL.createObjectURL(f) : c.toDataURL("image/png"));
      setBeforeSize(fmtBytes(f.size));
    } catch (err) {
      setStatus({ type: "warn", text: err.message || "This browser could not open that file as an image." });
    }
  }

  return (
    <div className="font-body" style={{ background: "var(--paper)", color: "var(--graphite)", minHeight: "100%" }}>
      <SiteHeader />

      <div className="grid-bg" style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "36px 32px 28px" }}>
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "12px",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", letterSpacing: "0.1em",
              color: "var(--blue)", background: "var(--blue-dim)", padding: "4px 10px", borderRadius: "10px",
            }}
          >
            <Images size={13} /> IMAGE CONVERTER
          </div>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "32px", margin: 0, letterSpacing: "-0.015em", color: "var(--ink)" }}>
            Convert and crop an image
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "var(--muted)", maxWidth: "620px" }}>
            Convert between JPG, PNG, and WebP — including iPhone HEIC photos and TIFF scans —
            and crop to a common aspect ratio or your own custom one. Runs on your device, the
            file is never uploaded.
          </p>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "28px 32px" }}>
        <div className="bracket-panel" style={{ background: "var(--white)", padding: "26px" }}>
          <Dropzone
            onFile={handleFile}
            title="Drop an image here, or click to choose one"
            hint="Any format your browser can open, plus HEIC/HEIF and TIFF"
            accept="image/*,.heic,.heif,.tif,.tiff"
          />

          {file && (
            <div style={{ marginTop: "22px" }}>
              {/* Format choice */}
              <div style={{ marginBottom: "20px" }}>
                <label style={fieldLabelStyle}>
                  Convert {sourceLabel ? `from ${sourceLabel} ` : ""}to
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {FORMATS.map((f) => {
                    const active = format === f.value;
                    return (
                      <button
                        key={f.value}
                        onClick={() => setFormat(f.value)}
                        style={{
                          flex: "1 1 140px",
                          textAlign: "left",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: `1.5px solid ${active ? "var(--ink)" : "var(--line)"}`,
                          background: active ? "var(--ink)" : "var(--white)",
                          cursor: "pointer",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "14px", color: active ? "var(--paper)" : "var(--ink)" }}>{f.label}</div>
                        <div style={{ fontSize: "11px", color: active ? "var(--paper)" : "var(--muted)", opacity: active ? 0.75 : 1, marginTop: "2px" }}>{f.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {format !== "image/png" && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={fieldLabelStyle}>Quality — {quality}%</label>
                  <input
                    type="range" min="10" max="100" value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--blue)" }}
                  />
                </div>
              )}

              {/* Aspect ratio choice */}
              <div style={{ marginBottom: "20px" }}>
                <label style={fieldLabelStyle}>Crop to aspect ratio</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {RATIOS.map((r) => {
                    const active = ratioKey === r.key;
                    return (
                      <button
                        key={r.key}
                        onClick={() => setRatioKey(r.key)}
                        style={{
                          padding: "8px 13px",
                          borderRadius: "999px",
                          border: `1.5px solid ${active ? "var(--ink)" : "var(--line)"}`,
                          background: active ? "var(--ink)" : "transparent",
                          color: active ? "var(--paper)" : "var(--muted)",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                {ratioKey === "custom" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                    <input
                      type="number" min="1" value={customW}
                      onChange={(e) => setCustomW(Math.max(1, parseInt(e.target.value) || 1))}
                      style={ratioInputStyle}
                    />
                    <span style={{ color: "var(--muted)", fontWeight: 600 }}>:</span>
                    <input
                      type="number" min="1" value={customH}
                      onChange={(e) => setCustomH(Math.max(1, parseInt(e.target.value) || 1))}
                      style={ratioInputStyle}
                    />
                    <span style={{ fontSize: "12.5px", color: "var(--muted)" }}>width : height</span>
                  </div>
                )}
              </div>

              {(beforeUrl || afterUrl) && (
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {beforeUrl && <PreviewFigure src={beforeUrl} label="Original" size={beforeSize} />}
                  {afterUrl && <PreviewFigure src={afterUrl} label={`Converted${afterDims ? " · " + afterDims : ""}`} size={afterSize} />}
                </div>
              )}

              <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  disabled={!outputBlob}
                  onClick={() => {
                    if (!outputBlob) return;
                    const ext = format.split("/")[1].replace("jpeg", "jpg");
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(outputBlob);
                    a.download = (file.name.replace(/\.[^.]+$/, "") || "converted") + "." + ext;
                    a.click();
                  }}
                  className="primary-btn"
                  style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", fontSize: "13.5px", fontWeight: 600, borderRadius: "10px", border: "none", cursor: outputBlob ? "pointer" : "not-allowed", fontFamily: "'Inter', sans-serif" }}
                >
                  <Download size={14} /> Download converted file
                </button>
                <button
                  onClick={reset}
                  style={{ display: "flex", alignItems: "center", gap: "7px", background: "transparent", border: "1px solid var(--line)", borderRadius: "10px", padding: "10px 16px", fontSize: "13.5px", fontWeight: 600, color: "var(--graphite)", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                >
                  <RotateCcw size={14} /> Start over
                </button>
              </div>

              <StatusBanner status={status} />
            </div>
          )}
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />
      <SiteFooter />
    </div>
  );
}

const fieldLabelStyle = { display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--muted)", marginBottom: "8px" };
const ratioInputStyle = {
  width: "64px", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--line)",
  background: "var(--white)", color: "var(--graphite)", fontFamily: "'IBM Plex Mono', monospace", fontSize: "14px", textAlign: "center",
};
