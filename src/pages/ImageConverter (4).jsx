import { useState, useRef, useEffect, useCallback } from "react";
import { Images, Download, RotateCcw, RotateCw, Copy, Check } from "lucide-react";
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

function labelForKind(kind, file) {
  if (kind === "heic") return "HEIC/HEIF";
  if (kind === "tiff") return "TIFF";
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (type === "image/jpeg" || /\.jpe?g$/.test(name)) return "JPEG";
  if (type === "image/png" || name.endsWith(".png")) return "PNG";
  if (type === "image/webp" || name.endsWith(".webp")) return "WebP";
  if (type === "image/gif" || name.endsWith(".gif")) return "GIF";
  if (type === "image/bmp" || name.endsWith(".bmp")) return "BMP";
  if (type === "image/avif" || name.endsWith(".avif")) return "AVIF";
  if (type === "image/svg+xml" || name.endsWith(".svg")) return "SVG";
  // Genuinely can't tell (e.g. a pasted image with no filename/MIME type).
  // Return null rather than the word "Unknown" — the caller just omits
  // the "from ___" clause instead of implying something went wrong.
  return null;
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

// width/height here are the ACTUAL output pixel dimensions a preset
// produces — not just a ratio. The crop still uses ratioW/ratioH to pick
// the best-framed rectangle from the source, but the final image is then
// scaled to exactly width×height so the label is always true.
const PRESETS = [
  { key: "original", label: "Original", ratioW: null, ratioH: null, width: null, height: null },
  { key: "square", label: "Square · 1080×1080", ratioW: 1, ratioH: 1, width: 1080, height: 1080 },
  { key: "portrait", label: "Portrait · 1080×1350", ratioW: 4, ratioH: 5, width: 1080, height: 1350 },
  { key: "story", label: "Story/Reel · 1080×1920", ratioW: 9, ratioH: 16, width: 1080, height: 1920 },
  { key: "landscape", label: "Landscape · 1280×720", ratioW: 16, ratioH: 9, width: 1280, height: 720 },
  { key: "standard", label: "Standard · 1200×900", ratioW: 4, ratioH: 3, width: 1200, height: 900 },
  { key: "custom", label: "Custom", ratioW: null, ratioH: null, width: null, height: null },
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

function PreviewFigure({ src, label, size, dims }) {
  return (
    <figure style={{ flex: "1 1 200px", margin: 0, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
      <img src={src} alt={label} style={{ maxWidth: "100%", maxHeight: "180px", borderRadius: "6px" }} />
      <figcaption style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>
        {label}{dims ? ` · ${dims}` : ""} · <b style={{ color: "var(--ink)" }}>{size}</b>
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
  const [keepFullRes, setKeepFullRes] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [beforeSize, setBeforeSize] = useState("");
  const [afterUrl, setAfterUrl] = useState(null);
  const [afterSize, setAfterSize] = useState("");
  const [afterDims, setAfterDims] = useState("");
  const [outputDims, setOutputDims] = useState({ w: 0, h: 0 });
  const [outputBlob, setOutputBlob] = useState(null);
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  // Free-typed draft text for the custom width/height boxes. Kept separate
  // from `crop` so clearing the field to retype a number never gets
  // clamped mid-keystroke — it only commits into `crop` on blur/Enter.
  const [widthDraft, setWidthDraft] = useState("");
  const [heightDraft, setHeightDraft] = useState("");

  const debounceRef = useRef(null);

  // Remember the last-used format/quality/preset/keepFullRes across visits.
  // Reads and writes only happen inside effects (client-side, post-mount),
  // wrapped in try/catch for private-browsing or storage-disabled cases —
  // never touched during render, so there's no SSR/hydration risk.
  const SETTINGS_KEY = "fixyorio:image-converter:settings";
  const settingsLoaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.format) setFormat(saved.format);
        if (typeof saved.quality === "number") setQuality(saved.quality);
        if (saved.presetKey) setPresetKey(saved.presetKey);
        if (typeof saved.keepFullRes === "boolean") setKeepFullRes(saved.keepFullRes);
      }
    } catch (e) {
      // localStorage unavailable — just proceed with the defaults.
    } finally {
      settingsLoaded.current = true;
    }
  }, []);

  useEffect(() => {
    if (!settingsLoaded.current) return; // don't overwrite saved settings with defaults before the restore above runs
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ format, quality, presetKey, keepFullRes }));
    } catch (e) {
      // localStorage unavailable — settings just won't persist this session.
    }
  }, [format, quality, presetKey, keepFullRes]);

  const runConversion = useCallback((sourceCanvas, fmt, q, cropRect, originalSize, targetDims) => {
    if (!sourceCanvas || !cropRect.w || !cropRect.h) return;

    // A preset like "Landscape · 1280×720" should actually output that
    // pixel size, not just something cropped to the same ratio. Scale the
    // crop down to the target — but never scale UP past the source's own
    // resolution, since that would just blur a smaller photo.
    let outW = Math.round(cropRect.w);
    let outH = Math.round(cropRect.h);
    let note = "";
    if (targetDims) {
      if (cropRect.w >= targetDims.width && cropRect.h >= targetDims.height) {
        outW = targetDims.width;
        outH = targetDims.height;
      } else {
        note = " (this photo is smaller than the preset size, so it was kept at its native resolution instead of being blurrily scaled up)";
      }
    }

    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext("2d");
    if (fmt === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
    }
    ctx.drawImage(sourceCanvas, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, outW, outH);
    out.toBlob((blob) => {
      if (!blob) {
        setStatus({ type: "warn", text: "This browser could not encode that format." });
        return;
      }
      setOutputBlob(blob);
      setAfterUrl(URL.createObjectURL(blob));
      setAfterSize(fmtBytes(blob.size));
      setAfterDims(`${outW}×${outH}px`);
      setOutputDims({ w: outW, h: outH });
      const delta = originalSize ? Math.round((1 - blob.size / originalSize) * 100) : 0;
      setStatus({ type: "ok", text: (delta > 0 ? `Converted — about ${delta}% smaller than the original.` : "Converted and ready to download.") + note });
    }, fmt, q / 100);
  }, []);

  // Debounced so dragging the quality slider or the crop handles stays
  // smooth — the actual (more expensive) canvas encode only fires once
  // things settle for a moment, not on every single intermediate change.
  useEffect(() => {
    if (!canvas || !crop.w || !crop.h) return;
    const preset = PRESETS.find((p) => p.key === presetKey);
    const targetDims = !keepFullRes && preset && preset.width && preset.height ? { width: preset.width, height: preset.height } : null;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runConversion(canvas, format, quality, crop, file?.size, targetDims);
    }, 120);
    return () => clearTimeout(debounceRef.current);
  }, [canvas, format, quality, crop, file, presetKey, keepFullRes, runConversion]);

  // Keep the draft text boxes in sync whenever the crop rect itself
  // changes for a reason OTHER than typing — picking a preset, dragging
  // the on-canvas handles, or a fresh image loading. While the user is
  // actively typing, `crop` hasn't changed yet, so this never fights them.
  useEffect(() => {
    setWidthDraft(crop.w ? String(Math.round(crop.w)) : "");
    setHeightDraft(crop.h ? String(Math.round(crop.h)) : "");
  }, [crop.w, crop.h]);

  // Clears everything that depends on the currently-loaded image, but
  // deliberately leaves format/quality/presetKey alone — those are the
  // settings a visitor may have already picked before uploading anything.
  function resetImageState() {
    setFile(null); setCanvas(null); setSourceLabel(""); setNaturalSize({ w: 0, h: 0 });
    setBeforeUrl(null); setAfterUrl(null); setAfterDims(""); setOutputDims({ w: 0, h: 0 });
    setBeforeSize(""); setAfterSize(""); setOutputBlob(null); setStatus(null);
    setCrop({ x: 0, y: 0, w: 0, h: 0 });
  }

  // "Start over" — wipes the chosen settings too, back to defaults.
  function resetAll() {
    resetImageState();
    setPresetKey("original"); setFormat("image/jpeg"); setQuality(85); setKeepFullRes(false);
    setJustCopied(false);
  }

  async function handleFile(f) {
    resetImageState();
    setFile(f);
    setIsLoading(true);
    try {
      const { canvas: c, kind } = await loadAnyImage(f);
      setCanvas(c);
      setNaturalSize({ w: c.width, h: c.height });
      setSourceLabel(labelForKind(kind, f));
      setBeforeUrl(kind === "standard" ? URL.createObjectURL(f) : c.toDataURL("image/png"));
      setBeforeSize(fmtBytes(f.size));

      // Apply whatever preset/format the user already picked before
      // uploading, rather than snapping back to "Original".
      const preset = PRESETS.find((p) => p.key === presetKey) || PRESETS[0];
      if (preset.key === "custom") {
        setCrop({ x: 0, y: 0, w: c.width, h: c.height });
      } else {
        setCrop(centeredCropForRatio(c.width, c.height, preset.ratioW, preset.ratioH));
      }
    } catch (err) {
      setStatus({ type: "warn", text: err.message || "This browser could not open that file as an image." });
    } finally {
      setIsLoading(false);
    }
  }

  // Always-current reference to handleFile, so the window-level paste
  // listener (attached once on mount) never captures a stale closure
  // over presetKey/format when the user pastes an image.
  const handleFileRef = useRef(handleFile);
  useEffect(() => { handleFileRef.current = handleFile; });

  useEffect(() => {
    function handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type && item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            const ext = blob.type.split("/")[1] || "png";
            const namedFile = new File([blob], `pasted-image.${ext}`, { type: blob.type });
            handleFileRef.current(namedFile);
          }
          break;
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  function choosePreset(preset) {
    setPresetKey(preset.key);
    if (preset.key !== "custom" && naturalSize.w > 0) {
      setCrop(centeredCropForRatio(naturalSize.w, naturalSize.h, preset.ratioW, preset.ratioH));
    }
  }

  // Rotates the working image 90° clockwise. This rewrites the underlying
  // canvas itself (not just a CSS transform) so every downstream step —
  // cropping, presets, the final export — operates on the rotated pixels.
  function rotateImage() {
    if (!canvas) return;
    const rotated = document.createElement("canvas");
    rotated.width = canvas.height;
    rotated.height = canvas.width;
    const ctx = rotated.getContext("2d");
    ctx.translate(rotated.width, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(canvas, 0, 0);

    const newSize = { w: rotated.width, h: rotated.height };
    setCanvas(rotated);
    setNaturalSize(newSize);
    setBeforeUrl(rotated.toDataURL("image/png"));

    const preset = PRESETS.find((p) => p.key === presetKey) || PRESETS[0];
    if (preset.key === "custom") {
      setCrop({ x: 0, y: 0, w: newSize.w, h: newSize.h });
    } else {
      setCrop(centeredCropForRatio(newSize.w, newSize.h, preset.ratioW, preset.ratioH));
    }
  }

  async function copyToClipboard() {
    if (!outputBlob) return;
    if (!navigator.clipboard || typeof window.ClipboardItem === "undefined") {
      setStatus({ type: "warn", text: "This browser doesn't support copying images to the clipboard — download it instead." });
      return;
    }
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ [outputBlob.type]: outputBlob })]);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1600);
    } catch (err) {
      setStatus({ type: "warn", text: "Couldn't copy that to the clipboard — download it instead." });
    }
  }

  // Typing a width/height re-centers the box around its CURRENT center,
  // rather than anchoring to its existing top-left corner. Anchoring to
  // x/y meant shrinking from a full-image crop (x=0, y=0) always pinned
  // the new box to the top-left corner — nothing like the centered crop
  // every preset produces. Re-centering makes typed dimensions behave
  // the same way a preset does, while still clamping into bounds so a
  // box near an edge doesn't run off the image.
  function setWidthPx(v) {
    const w = clamp(Math.round(v), 24, naturalSize.w);
    setCrop((c) => {
      const centerX = c.x + c.w / 2;
      const x = clamp(Math.round(centerX - w / 2), 0, naturalSize.w - w);
      return { ...c, x, w };
    });
  }
  function setHeightPx(v) {
    const h = clamp(Math.round(v), 24, naturalSize.h);
    setCrop((c) => {
      const centerY = c.y + c.h / 2;
      const y = clamp(Math.round(centerY - h / 2), 0, naturalSize.h - h);
      return { ...c, y, h };
    });
  }

  // Only commit (and clamp) once the user is done typing — on blur or
  // Enter — so an in-progress edit like clearing "600" to type "1200"
  // never gets stomped back to the 24px floor after the first keystroke.
  function commitWidthDraft() {
    const n = parseInt(widthDraft, 10);
    if (!isNaN(n)) setWidthPx(n);
    else setWidthDraft(String(Math.round(crop.w)));
  }
  function commitHeightDraft() {
    const n = parseInt(heightDraft, 10);
    if (!isNaN(n)) setHeightPx(n);
    else setHeightDraft(String(Math.round(crop.h)));
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
            hint="Any format your browser can open, plus HEIC/HEIF and TIFF — or just paste (Ctrl+V)"
            accept="image/*,.heic,.heif,.tif,.tiff"
          />

          {isLoading && (
            <div
              style={{
                marginTop: "16px", padding: "12px 14px", borderRadius: "10px", fontSize: "13.5px",
                background: "var(--blue-dim)", color: "var(--blue)", border: "1px solid var(--blue)",
                display: "flex", alignItems: "center", gap: "10px",
              }}
            >
              <span
                style={{
                  width: "14px", height: "14px", borderRadius: "50%",
                  border: "2px solid currentColor", borderTopColor: "transparent",
                  display: "inline-block", animation: "conv-spin 0.7s linear infinite", flexShrink: 0,
                }}
              />
              Reading your photo — this can take a few seconds for HEIC or large files.
              <style>{"@keyframes conv-spin { to { transform: rotate(360deg); } }"}</style>
            </div>
          )}

          {canvas && !isLoading && (
            <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={rotateImage}
                style={{
                  display: "flex", alignItems: "center", gap: "6px", background: "transparent",
                  border: "1px solid var(--line)", borderRadius: "999px", padding: "6px 12px",
                  fontSize: "12.5px", fontWeight: 600, color: "var(--graphite)", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <RotateCw size={13} /> Rotate 90°
              </button>
            </div>
          )}

          <div style={{ marginTop: "22px" }}>
            {/* Format choice — visible even before an image is uploaded,
                so visitors know what they're getting before they commit. */}
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

            {/* Size / crop choice — also visible pre-upload */}
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

              {presetKey !== "original" && presetKey !== "custom" && (
                <label style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "12px", fontSize: "12.5px", color: "var(--muted)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={keepFullRes}
                    onChange={(e) => setKeepFullRes(e.target.checked)}
                    style={{ accentColor: "var(--blue)" }}
                  />
                  Keep full resolution — crop to this shape but don't shrink the file down to {PRESETS.find((p) => p.key === presetKey)?.width}×{PRESETS.find((p) => p.key === presetKey)?.height}
                </label>
              )}

              {presetKey === "custom" && (
                naturalSize.w > 0 ? (
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>Width</span>
                        <input
                          type="number"
                          value={widthDraft}
                          min="24" max={naturalSize.w}
                          onChange={(e) => setWidthDraft(e.target.value)}
                          onBlur={commitWidthDraft}
                          onKeyDown={(e) => { if (e.key === "Enter") { commitWidthDraft(); e.currentTarget.blur(); } }}
                          onFocus={(e) => e.target.select()}
                          style={pxInputStyle}
                        />
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>px</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>Height</span>
                        <input
                          type="number"
                          value={heightDraft}
                          min="24" max={naturalSize.h}
                          onChange={(e) => setHeightDraft(e.target.value)}
                          onBlur={commitHeightDraft}
                          onKeyDown={(e) => { if (e.key === "Enter") { commitHeightDraft(); e.currentTarget.blur(); } }}
                          onFocus={(e) => e.target.select()}
                          style={pxInputStyle}
                        />
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>px</span>
                      </div>
                      <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>— or drag the box below</span>
                    </div>

                    {beforeUrl && (
                      <InteractiveCropper
                        imgSrc={beforeUrl}
                        naturalW={naturalSize.w}
                        naturalH={naturalSize.h}
                        crop={crop}
                        onCropChange={setCrop}
                      />
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--muted)" }}>
                    Upload a photo above to fine-tune this crop by hand — your custom-size choice will carry over.
                  </div>
                )
              )}
            </div>

            {!file && (
              <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                Drop or choose a photo above to convert it with these settings.
              </div>
            )}

            {file && (
              <>
                {presetKey !== "custom" && (beforeUrl || afterUrl) && (
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    {beforeUrl && <PreviewFigure src={beforeUrl} label="Original" size={beforeSize} dims={naturalSize.w ? `${naturalSize.w}×${naturalSize.h}px` : ""} />}
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
                      const base = file.name.replace(/\.[^.]+$/, "") || "converted";
                      const dimsSuffix = outputDims.w ? `-${outputDims.w}x${outputDims.h}` : "";
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(outputBlob);
                      a.download = `${base}${dimsSuffix}.${ext}`;
                      a.click();
                    }}
                    className="primary-btn"
                    style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", fontSize: "13.5px", fontWeight: 600, borderRadius: "10px", border: "none", cursor: outputBlob ? "pointer" : "not-allowed", fontFamily: "'Inter', sans-serif" }}
                  >
                    <Download size={14} /> Download converted file
                  </button>
                  <button
                    disabled={!outputBlob}
                    onClick={copyToClipboard}
                    style={{ display: "flex", alignItems: "center", gap: "7px", background: "transparent", border: "1px solid var(--line)", borderRadius: "10px", padding: "10px 16px", fontSize: "13.5px", fontWeight: 600, color: "var(--graphite)", cursor: outputBlob ? "pointer" : "not-allowed", fontFamily: "'Inter', sans-serif" }}
                  >
                    {justCopied ? <Check size={14} /> : <Copy size={14} />} {justCopied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={resetAll}
                    style={{ display: "flex", alignItems: "center", gap: "7px", background: "transparent", border: "1px solid var(--line)", borderRadius: "10px", padding: "10px 16px", fontSize: "13.5px", fontWeight: 600, color: "var(--graphite)", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                  >
                    <RotateCcw size={14} /> Start over
                  </button>
                </div>

                <StatusBanner status={status} />
              </>
            )}
          </div>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />
      <SiteFooter />
    </div>
  );
}

const fieldLabelStyle = { display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--muted)", marginBottom: "8px" };
const pxInputStyle = {
  width: "80px", padding: "7px 9px", borderRadius: "8px", border: "1px solid var(--line)",
  background: "var(--white)", color: "var(--graphite)", fontFamily: "'IBM Plex Mono', monospace", fontSize: "13.5px", textAlign: "center",
};
