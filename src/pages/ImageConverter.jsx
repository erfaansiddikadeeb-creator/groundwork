import { useState, useRef, useEffect, useCallback } from "react";
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

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Largest centered crop rect (in natural pixel coords) matching a W:H ratio.
function centeredCropForRatio(naturalW, naturalH, ratioW, ratioH) {
  if (!ratioW || !ratioH) return { x: 0, y: 0, w: naturalW, h: naturalH };
  const targetRatio = ratioW / ratioH;
  const currentRatio = naturalW / naturalH;
  if (Math.abs(currentRatio - targetRatio) < 0.002) return { x: 0, y: 0, w: naturalW, h: naturalH };
  if (currentRatio > targetRatio) {
    const w = Math.round(naturalH * targetRatio);
    return { x: Math.round((naturalW - w) / 2), y: 0, w, h: naturalH };
  }
  const h = Math.round(naturalW / targetRatio);
  return { x: 0, y: Math.round((naturalH - h) / 2), w: naturalW, h };
}

// Rectangle between a fixed anchor point and a moving point, clamped to
// image bounds with a minimum size — used while dragging a corner handle.
function rectFromAnchorAndPoint(anchorX, anchorY, pointX, pointY, maxW, maxH, minSize = 24) {
  pointX = clamp(pointX, 0, maxW);
  pointY = clamp(pointY, 0, maxH);
  let x = Math.min(anchorX, pointX);
  let y = Math.min(anchorY, pointY);
  let w = Math.abs(pointX - anchorX);
  let h = Math.abs(pointY - anchorY);
  if (w < minSize) {
    w = minSize;
    x = pointX < anchorX ? clamp(anchorX - minSize, 0, maxW - minSize) : clamp(anchorX, 0, maxW - minSize);
  }
  if (h < minSize) {
    h = minSize;
    y = pointY < anchorY ? clamp(anchorY - minSize, 0, maxH - minSize) : clamp(anchorY, 0, maxH - minSize);
  }
  return { x, y, w, h };
}

/* ---------------------------------------------------------
   Presets — ratio-driven crop, labeled with realistic
   real-world pixel dimensions rather than a bare ratio.
--------------------------------------------------------- */

const PRESETS = [
  { key: "original", label: "Original", ratioW: null, ratioH: null },
  { key: "square", label: "Square · 1080×1080", ratioW: 1, ratioH: 1 },
  { key: "portrait", label: "Portrait · 1080×1350", ratioW: 4, ratioH: 5 },
  { key: "story", label: "Story/Reel · 1080×1920", ratioW: 9, ratioH: 16 },
  { key: "landscape", label: "Landscape · 1280×720", ratioW: 16, ratioH: 9 },
  { key: "standard", label: "Standard · 1200×900", ratioW: 4, ratioH: 3 },
  { key: "custom", label: "Custom", ratioW: null, ratioH: null },
];

const FORMATS = [
  { value: "image/jpeg", label: "JPG", hint: "smaller, no transparency" },
  { value: "image/png", label: "PNG", hint: "lossless, supports transparency" },
  { value: "image/webp", label: "WebP", hint: "smaller, supports transparency" },
];

const DISPLAY_MAX = 380; // px, the interactive cropper's bounding box

/* ---------------------------------------------------------
   UI bits
--------------------------------------------------------- */

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

// The interactive Canva-style crop box: drag the body to move it, drag a
// corner to resize it. Dragging only updates cheap CSS/state — the actual
// image re-encode is debounced separately so this stays smooth.
function InteractiveCropper({ imgSrc, naturalW, naturalH, crop, onCropChange }) {
  const dragRef = useRef(null);
  const scale = Math.min(DISPLAY_MAX / naturalW, DISPLAY_MAX / naturalH, 1);
  const displayW = naturalW * scale;
  const displayH = naturalH * scale;

  const handlePointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startClientX) / scale;
    const dy = (e.clientY - drag.startClientY) / scale;
    const sc = drag.startCrop;

    if (drag.mode === "move") {
      const nx = clamp(sc.x + dx, 0, naturalW - sc.w);
      const ny = clamp(sc.y + dy, 0, naturalH - sc.h);
      onCropChange({ ...sc, x: nx, y: ny });
    } else if (drag.mode === "resize") {
      let anchorX, anchorY, pointX, pointY;
      if (drag.corner === "se") { anchorX = sc.x; anchorY = sc.y; pointX = sc.x + sc.w + dx; pointY = sc.y + sc.h + dy; }
      else if (drag.corner === "sw") { anchorX = sc.x + sc.w; anchorY = sc.y; pointX = sc.x + dx; pointY = sc.y + sc.h + dy; }
      else if (drag.corner === "ne") { anchorX = sc.x; anchorY = sc.y + sc.h; pointX = sc.x + sc.w + dx; pointY = sc.y + dy; }
      else { anchorX = sc.x + sc.w; anchorY = sc.y + sc.h; pointX = sc.x + dx; pointY = sc.y + dy; }
      onCropChange(rectFromAnchorAndPoint(anchorX, anchorY, pointX, pointY, naturalW, naturalH));
    }
  }, [scale, naturalW, naturalH, onCropChange]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove]);

  function startDrag(mode, corner) {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { mode, corner, startClientX: e.clientX, startClientY: e.clientY, startCrop: { ...crop } };
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    };
  }

  useEffect(() => () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  const handleStyle = (cursor) => ({
    position: "absolute",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: "var(--blue)",
    border: "2px solid #fff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
    cursor,
    touchAction: "none",
  });

  return (
    <div style={{ position: "relative", width: displayW, height: displayH, userSelect: "none", touchAction: "none" }}>
      <img src={imgSrc} alt="Original" style={{ width: displayW, height: displayH, display: "block", borderRadius: "6px" }} draggable={false} />
      <div
        onPointerDown={startDrag("move")}
        style={{
          position: "absolute",
          left: crop.x * scale,
          top: crop.y * scale,
          width: crop.w * scale,
          height: crop.h * scale,
          border: "2px solid var(--blue)",
          boxShadow: "0 0 0 9999px rgba(20,20,20,0.45)",
          cursor: "move",
          touchAction: "none",
        }}
      >
        <div onPointerDown={startDrag("resize", "nw")} style={{ ...handleStyle("nwse-resize"), left: -7, top: -7 }} />
        <div onPointerDown={startDrag("resize", "ne")} style={{ ...handleStyle("nesw-resize"), right: -7, top: -7 }} />
        <div onPointerDown={startDrag("resize", "sw")} style={{ ...handleStyle("nesw-resize"), left: -7, bottom: -7 }} />
        <div onPointerDown={startDrag("resize", "se")} style={{ ...handleStyle("nwse-resize"), right: -7, bottom: -7 }} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Page
--------------------------------------------------------- */

export default function ImageConverter() {
  usePageTitle(
    "Image Converter — Fixyorio",
    "Free image converter. Convert between JPG, PNG, and WebP — including HEIC and TIFF — and crop to a common size or your own custom pixel dimensions. Runs in your browser."
  );

  const [file, setFile] = useState(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [canvas, setCanvas] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [format, setFormat] = useState("image/jpeg");
  const [quality, setQuality] = useState(85);
  const [presetKey, setPresetKey] = useState("original");
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [beforeSize, setBeforeSize] = useState("");
  const [afterUrl, setAfterUrl] = useState(null);
  const [afterSize, setAfterSize] = useState("");
  const [afterDims, setAfterDims] = useState("");
  const [outputBlob, setOutputBlob] = useState(null);
  const [status, setStatus] = useState(null);

  const debounceRef = useRef(null);

  const runConversion = useCallback((sourceCanvas, fmt, q, cropRect, originalSize) => {
    if (!sourceCanvas || !cropRect.w || !cropRect.h) return;
    const out = document.createElement("canvas");
    out.width = Math.round(cropRect.w);
    out.height = Math.round(cropRect.h);
    const ctx = out.getContext("2d");
    if (fmt === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.drawImage(sourceCanvas, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, out.width, out.height);
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

  // Debounced so dragging the quality slider or the crop handles stays
  // smooth — the actual (more expensive) canvas encode only fires once
  // things settle for a moment, not on every single intermediate change.
  useEffect(() => {
    if (!canvas || !crop.w || !crop.h) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runConversion(canvas, format, quality, crop, file?.size);
    }, 120);
    return () => clearTimeout(debounceRef.current);
  }, [canvas, format, quality, crop, file, runConversion]);

  function reset() {
    setFile(null); setCanvas(null); setSourceLabel(""); setNaturalSize({ w: 0, h: 0 });
    setBeforeUrl(null); setAfterUrl(null); setAfterDims("");
    setBeforeSize(""); setAfterSize(""); setOutputBlob(null); setStatus(null);
    setPresetKey("original"); setFormat("image/jpeg"); setQuality(85);
    setCrop({ x: 0, y: 0, w: 0, h: 0 });
  }

  async function handleFile(f) {
    reset();
    setFile(f);
    try {
      const { canvas: c, kind } = await loadAnyImage(f);
      setCanvas(c);
      setNaturalSize({ w: c.width, h: c.height });
      setCrop({ x: 0, y: 0, w: c.width, h: c.height });
      setSourceLabel(labelForKind(kind, f.type));
      setBeforeUrl(kind === "standard" ? URL.createObjectURL(f) : c.toDataURL("image/png"));
      setBeforeSize(fmtBytes(f.size));
    } catch (err) {
      setStatus({ type: "warn", text: err.message || "This browser could not open that file as an image." });
    }
  }

  function choosePreset(preset) {
    setPresetKey(preset.key);
    if (preset.key !== "custom") {
      setCrop(centeredCropForRatio(naturalSize.w, naturalSize.h, preset.ratioW, preset.ratioH));
    }
  }

  function setWidthPx(v) {
    const w = clamp(Math.round(v) || 1, 24, naturalSize.w - crop.x);
    setCrop((c) => ({ ...c, w }));
  }
  function setHeightPx(v) {
    const h = clamp(Math.round(v) || 1, 24, naturalSize.h - crop.y);
    setCrop((c) => ({ ...c, h }));
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
            and crop to a common size or drag your own custom crop. Runs on your device, the
            file is never uploaded.
          </p>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "28px 32px" }}>
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

              {/* Size / crop choice */}
              <div style={{ marginBottom: "20px" }}>
                <label style={fieldLabelStyle}>Crop to size</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {PRESETS.map((p) => {
                    const active = presetKey === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => choosePreset(p)}
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
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {presetKey === "custom" && (
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>Width</span>
                        <input
                          type="number" value={Math.round(crop.w)} min="24" max={naturalSize.w}
                          onChange={(e) => setWidthPx(parseInt(e.target.value))}
                          style={pxInputStyle}
                        />
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>px</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>Height</span>
                        <input
                          type="number" value={Math.round(crop.h)} min="24" max={naturalSize.h}
                          onChange={(e) => setHeightPx(parseInt(e.target.value))}
                          style={pxInputStyle}
                        />
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>px</span>
                      </div>
                      <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>— or drag the box below</span>
                    </div>

                    {beforeUrl && naturalSize.w > 0 && (
                      <InteractiveCropper
                        imgSrc={beforeUrl}
                        naturalW={naturalSize.w}
                        naturalH={naturalSize.h}
                        crop={crop}
                        onCropChange={setCrop}
                      />
                    )}
                  </div>
                )}
              </div>

              {presetKey !== "custom" && (beforeUrl || afterUrl) && (
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {beforeUrl && <PreviewFigure src={beforeUrl} label="Original" size={beforeSize} />}
                  {afterUrl && <PreviewFigure src={afterUrl} label={`Converted${afterDims ? " · " + afterDims : ""}`} size={afterSize} />}
                </div>
              )}

              {presetKey === "custom" && afterUrl && (
                <div style={{ marginTop: "18px" }}>
                  <PreviewFigure src={afterUrl} label={`Converted${afterDims ? " · " + afterDims : ""}`} size={afterSize} />
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
const pxInputStyle = {
  width: "72px", padding: "7px 9px", borderRadius: "8px", border: "1px solid var(--line)",
  background: "var(--white)", color: "var(--graphite)", fontFamily: "'IBM Plex Mono', monospace", fontSize: "13.5px", textAlign: "center",
};
