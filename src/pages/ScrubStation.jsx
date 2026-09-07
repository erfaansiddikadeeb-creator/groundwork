import { useState, useRef, useEffect, useCallback } from "react";
import { Eraser, Image as ImageIcon, ClipboardList, Download, RotateCcw } from "lucide-react";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

/* ---------------------------------------------------------
   Pure helpers — unchanged logic from the original tool,
   just DOM-independent so they work the same in React.
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

const ORIENTATION_LABELS = {
  1: "Normal", 2: "Flipped horizontally", 3: "Rotated 180°", 4: "Flipped vertically",
  5: "Rotated 90° CW + flipped", 6: "Rotated 90° CW", 7: "Rotated 270° CW + flipped", 8: "Rotated 270° CW",
};

function parseExif(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return null;
  let offset = 2;
  const len = view.byteLength;
  while (offset < len - 4) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xe1) {
      const segLen = view.getUint16(offset + 2, false);
      const segStart = offset + 4;
      if (readString(view, segStart, 4) === "Exif") {
        try { return parseTiff(view, segStart + 6); } catch (e) { return null; }
      }
      offset += 2 + segLen;
    } else if (marker === 0xd9 || marker === 0xda) {
      break;
    } else {
      const segLen = view.getUint16(offset + 2, false);
      offset += 2 + segLen;
    }
  }
  return null;
}

function parseTiff(view, tiffStart) {
  const little = view.getUint16(tiffStart, false) === 0x4949;
  const get16 = (o) => view.getUint16(o, little);
  const get32 = (o) => view.getUint32(o, little);
  const ifd0Offset = get32(tiffStart + 4);
  const tags = {};
  let gpsOffset = null;

  function readIFD(ifdStart) {
    const count = get16(ifdStart);
    for (let i = 0; i < count; i++) {
      const entry = ifdStart + 2 + i * 12;
      const tag = get16(entry);
      const type = get16(entry + 2);
      const numValues = get32(entry + 4);
      const valueOffsetField = entry + 8;

      let value;
      if (type === 2) {
        const strOffset = numValues <= 4 ? valueOffsetField : tiffStart + get32(valueOffsetField);
        value = readString(view, strOffset, numValues).replace(/\0+$/, "");
      } else if (type === 3) {
        value = numValues === 1 ? get16(valueOffsetField) : get16(tiffStart + get32(valueOffsetField));
      } else if (type === 4) {
        value = numValues === 1 ? get32(valueOffsetField) : get32(tiffStart + get32(valueOffsetField));
      } else if (type === 5 && numValues >= 1) {
        const arrOffset = tiffStart + get32(valueOffsetField);
        const arr = [];
        for (let k = 0; k < numValues; k++) {
          const num = get32(arrOffset + k * 8);
          const den = get32(arrOffset + k * 8 + 4);
          arr.push(den ? num / den : 0);
        }
        value = arr;
      } else {
        continue;
      }

      if (tag === 0x8825) { gpsOffset = tiffStart + get32(valueOffsetField); }
      tags[tag] = value;
    }
  }

  readIFD(tiffStart + ifd0Offset);

  const result = {};
  if (tags[0x010f]) result["Camera make"] = tags[0x010f];
  if (tags[0x0110]) result["Camera model"] = tags[0x0110];
  if (tags[0x0131]) result["Software"] = tags[0x0131];
  if (tags[0x0132]) result["Date taken"] = tags[0x0132];
  if (tags[0x0112]) result["Orientation"] = ORIENTATION_LABELS[tags[0x0112]] || tags[0x0112];
  result.__orientation = tags[0x0112] || 1;

  if (gpsOffset) {
    try {
      const gpsCount = get16(gpsOffset);
      const gps = {};
      for (let i = 0; i < gpsCount; i++) {
        const entry = gpsOffset + 2 + i * 12;
        const tag = get16(entry);
        const type = get16(entry + 2);
        const numValues = get32(entry + 4);
        const valueOffsetField = entry + 8;
        if (tag === 1 || tag === 3) {
          gps[tag] = readString(view, valueOffsetField, numValues).replace(/\0+$/, "");
        } else if (tag === 2 || tag === 4) {
          const arrOffset = tiffStart + get32(valueOffsetField);
          const dms = [];
          for (let k = 0; k < 3; k++) {
            const num = get32(arrOffset + k * 8);
            const den = get32(arrOffset + k * 8 + 4);
            dms.push(den ? num / den : 0);
          }
          gps[tag] = dms;
        }
      }
      if (gps[2] && gps[4]) {
        const lat = (gps[2][0] + gps[2][1] / 60 + gps[2][2] / 3600) * (gps[1] === "S" ? -1 : 1);
        const lon = (gps[4][0] + gps[4][1] / 60 + gps[4][2] / 3600) * (gps[3] === "W" ? -1 : 1);
        result["GPS location"] = lat.toFixed(5) + ", " + lon.toFixed(5);
        result.__hasGPS = true;
      }
    } catch (e) {}
  }

  return result;
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
    return {
      canvas, kind, meta: null,
      note: "HEIC uses a different container than JPEG, so its metadata isn't read field-by-field here — but decoding and re-encoding the image this way clears it regardless.",
    };
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
    let meta = null;
    try { meta = parseTiff(new DataView(buffer), 0); } catch (e) { meta = null; }
    const rawCanvas = document.createElement("canvas");
    rawCanvas.width = w;
    rawCanvas.height = h;
    const rctx = rawCanvas.getContext("2d");
    const imageData = rctx.createImageData(w, h);
    imageData.data.set(rgba);
    rctx.putImageData(imageData, 0, 0);
    const orientation = meta ? (meta.__orientation || 1) : 1;
    const canvas = orientation !== 1 ? orientCanvas(rawCanvas, w, h, orientation) : rawCanvas;
    return { canvas, kind, meta, note: null };
  }

  const img = await blobToImage(file);
  let meta = null;
  const looksJpeg = file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name || "");
  if (looksJpeg) {
    try {
      const buffer = await file.arrayBuffer();
      meta = parseExif(buffer);
    } catch (e) { meta = null; }
  }
  const orientation = meta ? (meta.__orientation || 1) : 1;
  const canvas = orientCanvas(img, img.naturalWidth, img.naturalHeight, orientation);
  return { canvas, kind, meta, note: null };
}

const ALLOWED_TAGS = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "A", "H1", "H2", "H3", "BLOCKQUOTE"]);

function sanitizePaste(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  let stripped = 0;
  function walk(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 1) {
        const tag = child.tagName;
        [...child.attributes].forEach((attr) => {
          if (!(tag === "A" && attr.name === "href")) {
            child.removeAttribute(attr.name);
            stripped++;
          }
        });
        walk(child);
        if (!ALLOWED_TAGS.has(tag)) {
          stripped++;
          while (child.firstChild) node.insertBefore(child.firstChild, child);
          node.removeChild(child);
        }
      } else if (child.nodeType === 8) {
        node.removeChild(child);
        stripped++;
      }
    });
  }
  walk(doc.body);
  return { html: doc.body.innerHTML, stripped };
}

/* ---------------------------------------------------------
   Shared UI bits matching the rest of the site
--------------------------------------------------------- */

const TABS = [
  { key: "exif", label: "Strip EXIF", icon: Eraser },
  { key: "convert", label: "Convert image", icon: ImageIcon },
  { key: "paste", label: "Clean paste", icon: ClipboardList },
];

function Dropzone({ onFile, title, hint, accept }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  return (
    <div
      onClick={() => inputRef.current?.click()}
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
        ref={inputRef}
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
        marginTop: "16px",
        padding: "12px 14px",
        borderRadius: "10px",
        fontSize: "13.5px",
        lineHeight: 1.5,
        background: isWarn ? "var(--red-dim)" : "var(--green-dim)",
        color: isWarn ? "var(--red)" : "var(--green)",
        border: `1px solid ${isWarn ? "var(--red)" : "var(--green)"}`,
      }}
    >
      {status.text}
    </div>
  );
}

/* ---------------------------------------------------------
   Main page
--------------------------------------------------------- */

export default function ScrubStation() {
  usePageTitle(
    "Scrub Station — Fixyorio",
    "Free local file cleaning tools. Strip EXIF/GPS metadata from photos, convert image formats, and clean formatted paste — all in your browser, nothing uploaded."
  );

  const [activeTab, setActiveTab] = useState("exif");

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
            <Eraser size={13} /> SCRUB STATION
          </div>
          <h1
            style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "32px",
              margin: 0, letterSpacing: "-0.015em", color: "var(--ink)",
            }}
          >
            Clean a photo or paste before you share it
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "var(--muted)", maxWidth: "620px" }}>
            Strip hidden EXIF/GPS data from a photo, convert between image formats, or clean
            formatting out of a paste — all three run entirely in your browser. Nothing is
            uploaded anywhere.
          </p>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "28px 32px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  background: active ? "var(--ink)" : "var(--white)",
                  color: active ? "var(--paper)" : "var(--muted)",
                  border: `1.5px solid ${active ? "var(--ink)" : "var(--line)"}`,
                  borderRadius: "10px",
                  padding: "9px 16px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "exif" && <ExifPanel />}
        {activeTab === "convert" && <ConvertPanel />}
        {activeTab === "paste" && <PastePanel />}
      </div>

      <AdSlot label="Advertisement" height={90} />
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------------------------------
   EXIF panel
--------------------------------------------------------- */

function ExifPanel() {
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState(null);
  const [note, setNote] = useState(null);
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [afterUrl, setAfterUrl] = useState(null);
  const [beforeSize, setBeforeSize] = useState("");
  const [afterSize, setAfterSize] = useState("");
  const [outputBlob, setOutputBlob] = useState(null);
  const [outputName, setOutputName] = useState("cleaned-photo");
  const [status, setStatus] = useState(null);

  function reset() {
    setFile(null); setMeta(null); setNote(null);
    setBeforeUrl(null); setAfterUrl(null);
    setBeforeSize(""); setAfterSize("");
    setOutputBlob(null); setStatus(null);
  }

  async function handleFile(f) {
    reset();
    setFile(f);
    try {
      const { canvas, meta: m, kind, note: n } = await loadAnyImage(f);
      setMeta(m);
      setNote(n);

      setBeforeUrl(kind === "standard" ? URL.createObjectURL(f) : canvas.toDataURL("image/png"));
      setBeforeSize(fmtBytes(f.size));

      const outType = (kind === "standard" && f.type === "image/png") ? "image/png" : "image/jpeg";
      canvas.toBlob((blob) => {
        setOutputBlob(blob);
        setOutputName("cleaned-" + (f.name.replace(/\.[^.]+$/, "") || "photo") + (outType === "image/png" ? ".png" : ".jpg"));
        setAfterUrl(URL.createObjectURL(blob));
        setAfterSize(fmtBytes(blob.size));

        const fields = m ? Object.keys(m).filter((k) => !k.startsWith("__")) : [];
        setStatus({
          type: "ok",
          text: n
            ? n
            : fields.length
            ? `Re-encoded the image — ${fields.length} metadata field${fields.length > 1 ? "s" : ""} removed.`
            : "Re-encoded the image. No metadata was found, but re-encoding also clears any hidden chunks a viewer wouldn't normally show you.",
        });
      }, outType, 0.95);
    } catch (err) {
      setStatus({ type: "warn", text: err.message || "Could not process that file." });
    }
  }

  const fields = meta ? Object.keys(meta).filter((k) => !k.startsWith("__")) : [];

  return (
    <div className="bracket-panel" style={{ background: "var(--white)", padding: "26px" }}>
      <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "19px", margin: "0 0 6px", color: "var(--ink)" }}>
        Strip EXIF
      </h2>
      <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--muted)", margin: "0 0 20px", maxWidth: "62ch" }}>
        Photos from phones and cameras often carry the make and model of the device, the exact
        time a photo was taken, and sometimes GPS coordinates. This reads what's embedded, then
        re-encodes the image from scratch so none of it survives.
      </p>

      <Dropzone
        onFile={handleFile}
        title="Drop a photo here, or click to choose one"
        hint="JPEG, PNG, WebP, HEIC/HEIF, or TIFF · stays on this device"
        accept="image/*,.heic,.heif,.tif,.tiff"
      />

      {file && (
        <div style={{ marginTop: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
            <thead>
              <tr>
                <th style={thStyle}>Field found in file</th>
                <th style={thStyle}>Value</th>
              </tr>
            </thead>
            <tbody>
              {note ? (
                <tr><td style={tdKeyStyle}>Format note</td><td style={tdValStyle}>{note}</td></tr>
              ) : fields.length === 0 ? (
                <tr><td style={tdKeyStyle}>No embedded metadata detected</td><td style={tdValStyle}>—</td></tr>
              ) : (
                fields.map((k) => (
                  <tr key={k}>
                    <td style={tdKeyStyle}>
                      {k}
                      {k === "GPS location" && (
                        <span style={{ marginLeft: "6px", fontSize: "11px", padding: "1px 7px", borderRadius: "999px", background: "var(--red-dim)", color: "var(--red)", fontWeight: 600 }}>
                          sensitive
                        </span>
                      )}
                    </td>
                    <td style={tdValStyle}>{meta[k]}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {beforeUrl && afterUrl && (
            <div style={{ display: "flex", gap: "16px", marginTop: "18px", flexWrap: "wrap" }}>
              <PreviewFigure src={beforeUrl} label="Before" size={beforeSize} />
              <PreviewFigure src={afterUrl} label="After" size={afterSize} />
            </div>
          )}

          <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              disabled={!outputBlob}
              onClick={() => {
                if (!outputBlob) return;
                const a = document.createElement("a");
                a.href = URL.createObjectURL(outputBlob);
                a.download = outputName;
                a.click();
              }}
              className="primary-btn"
              style={btnStyle(!outputBlob)}
            >
              <Download size={14} /> Download cleaned photo
            </button>
            <button onClick={reset} style={ghostBtnStyle}>
              <RotateCcw size={14} /> Start over
            </button>
          </div>

          <StatusBanner status={status} />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Convert panel
--------------------------------------------------------- */

function ConvertPanel() {
  const [file, setFile] = useState(null);
  const [canvas, setCanvas] = useState(null);
  const [kind, setKind] = useState("standard");
  const [format, setFormat] = useState("image/png");
  const [quality, setQuality] = useState(85);
  const [beforeUrl, setBeforeUrl] = useState(null);
  const [beforeSize, setBeforeSize] = useState("");
  const [beforeType, setBeforeType] = useState("");
  const [afterUrl, setAfterUrl] = useState(null);
  const [afterSize, setAfterSize] = useState("");
  const [outputBlob, setOutputBlob] = useState(null);
  const [status, setStatus] = useState(null);

  const runConversion = useCallback((sourceCanvas, fmt, q, originalSize) => {
    if (!sourceCanvas) return;
    const out = document.createElement("canvas");
    out.width = sourceCanvas.width;
    out.height = sourceCanvas.height;
    const ctx = out.getContext("2d");
    if (fmt === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.drawImage(sourceCanvas, 0, 0);
    out.toBlob((blob) => {
      if (!blob) {
        setStatus({ type: "warn", text: "This browser could not encode that format." });
        return;
      }
      setOutputBlob(blob);
      setAfterUrl(URL.createObjectURL(blob));
      setAfterSize(fmtBytes(blob.size));
      const delta = originalSize ? Math.round((1 - blob.size / originalSize) * 100) : 0;
      setStatus({ type: "ok", text: delta > 0 ? `Converted — about ${delta}% smaller than the original.` : "Converted and ready to download." });
    }, fmt, q / 100);
  }, []);

  useEffect(() => {
    if (canvas) runConversion(canvas, format, quality, file?.size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, format, quality]);

  function reset() {
    setFile(null); setCanvas(null); setBeforeUrl(null); setAfterUrl(null);
    setBeforeSize(""); setBeforeType(""); setAfterSize(""); setOutputBlob(null); setStatus(null);
  }

  async function handleFile(f) {
    reset();
    setFile(f);
    try {
      const { canvas: c, kind: k } = await loadAnyImage(f);
      setKind(k);
      setCanvas(c);
      setBeforeUrl(k === "standard" ? URL.createObjectURL(f) : c.toDataURL("image/png"));
      setBeforeSize(fmtBytes(f.size));
      setBeforeType(k === "heic" ? "HEIC/HEIF (decoded)" : k === "tiff" ? "TIFF (decoded)" : (f.type || "unknown type"));
    } catch (err) {
      setStatus({ type: "warn", text: err.message || "This browser could not open that file as an image." });
    }
  }

  return (
    <div className="bracket-panel" style={{ background: "var(--white)", padding: "26px" }}>
      <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "19px", margin: "0 0 6px", color: "var(--ink)" }}>
        Convert image
      </h2>
      <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--muted)", margin: "0 0 20px", maxWidth: "62ch" }}>
        Re-encode an image into PNG, JPEG, or WebP — including iPhone HEIC photos and TIFF scans.
        Runs on your device's own image decoder, plus two small open-source decoder libraries for
        HEIC and TIFF — the file is never sent anywhere to do this.
      </p>

      <Dropzone
        onFile={handleFile}
        title="Drop an image here, or click to choose one"
        hint="Any format your browser can open, plus HEIC/HEIF and TIFF"
        accept="image/*,.heic,.heif,.tif,.tiff"
      />

      {file && (
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "18px" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={fieldLabelStyle}>Output format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} style={selectStyle}>
                <option value="image/png">PNG — lossless, supports transparency</option>
                <option value="image/jpeg">JPEG — smaller, no transparency</option>
                <option value="image/webp">WebP — smaller, supports transparency</option>
              </select>
            </div>
            {format !== "image/png" && (
              <div style={{ flex: "1 1 200px" }}>
                <label style={fieldLabelStyle}>Quality — {quality}%</label>
                <input
                  type="range" min="10" max="100" value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--blue)" }}
                />
              </div>
            )}
          </div>

          {beforeUrl && (
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <PreviewFigure src={beforeUrl} label="Original" size={beforeSize} extra={beforeType} />
              {afterUrl && <PreviewFigure src={afterUrl} label="Converted" size={afterSize} />}
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
              style={btnStyle(!outputBlob)}
            >
              <Download size={14} /> Download converted file
            </button>
            <button onClick={reset} style={ghostBtnStyle}>
              <RotateCcw size={14} /> Start over
            </button>
          </div>

          <StatusBanner status={status} />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Paste clean panel
--------------------------------------------------------- */

function PastePanel() {
  const inputRef = useRef(null);
  const outputRef = useRef(null);
  const lastHtmlRef = useRef("");
  const lastTextRef = useRef("");
  const [mode, setMode] = useState("plain");
  const [inStats, setInStats] = useState(null);
  const [outStats, setOutStats] = useState(null);
  const [status, setStatus] = useState(null);
  const [hasContent, setHasContent] = useState(false);

  const render = useCallback((currentMode) => {
    const out = outputRef.current;
    if (!out) return;
    if (!lastHtmlRef.current && !lastTextRef.current) {
      out.innerHTML = "";
      setOutStats(null);
      return;
    }
    if (currentMode === "plain") {
      out.textContent = lastTextRef.current;
      setOutStats({ chars: lastTextRef.current.length, note: "All formatting removed" });
    } else {
      const source = lastHtmlRef.current || "<p>" + lastTextRef.current.replace(/\n/g, "</p><p>") + "</p>";
      const { html, stripped } = sanitizePaste(source);
      out.innerHTML = html || lastTextRef.current;
      setOutStats({ stripped, note: "Bold, italic, links, and lists kept" });
    }
  }, []);

  function handlePaste(e) {
    e.preventDefault();
    lastHtmlRef.current = e.clipboardData.getData("text/html");
    lastTextRef.current = e.clipboardData.getData("text/plain");
    if (inputRef.current) inputRef.current.innerText = lastTextRef.current;
    setHasContent(true);
    setInStats({ chars: lastTextRef.current.length, rich: !!lastHtmlRef.current });
    render(mode);
  }

  function handleInput() {
    lastTextRef.current = inputRef.current?.innerText || "";
    lastHtmlRef.current = "";
    setHasContent(lastTextRef.current.length > 0);
    render(mode);
  }

  function switchMode(m) {
    setMode(m);
    render(m);
  }

  async function copyOutput() {
    const text = mode === "plain" ? outputRef.current?.textContent : outputRef.current?.innerText;
    try {
      await navigator.clipboard.writeText(text || "");
      setStatus({ type: "ok", text: "Copied to clipboard." });
      setTimeout(() => setStatus(null), 2200);
    } catch (e) {
      setStatus({ type: "warn", text: "Could not access the clipboard — select the text above and copy manually." });
    }
  }

  function clearAll() {
    lastHtmlRef.current = ""; lastTextRef.current = "";
    if (inputRef.current) inputRef.current.innerHTML = "";
    if (outputRef.current) outputRef.current.innerHTML = "";
    setInStats(null); setOutStats(null); setStatus(null); setHasContent(false);
  }

  return (
    <div className="bracket-panel" style={{ background: "var(--white)", padding: "26px" }}>
      <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "19px", margin: "0 0 6px", color: "var(--ink)" }}>
        Clean paste
      </h2>
      <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--muted)", margin: "0 0 20px", maxWidth: "62ch" }}>
        Text copied from Word, Google Docs, or a webpage drags along fonts, colors, and layout
        markup you probably don't want. Paste it below and choose how much formatting survives.
      </p>

      <label style={fieldLabelStyle}>Paste your text here</label>
      <div
        ref={inputRef}
        contentEditable
        suppressContentEditableWarning
        onPaste={handlePaste}
        onInput={handleInput}
        data-placeholder="Paste (Ctrl/Cmd+V) formatted text here…"
        style={editableStyle}
      />

      {inStats && (
        <div style={statLineStyle}>
          <span>Pasted <b>{inStats.chars}</b> characters</span>
          <span>{inStats.rich ? "Rich formatting detected" : "Plain text only"}</span>
        </div>
      )}

      <div style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
          {["plain", "basic"].map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600,
                padding: "7px 14px", borderRadius: "999px",
                border: `1px solid ${mode === m ? "var(--ink)" : "var(--line)"}`,
                background: mode === m ? "var(--ink)" : "transparent",
                color: mode === m ? "var(--paper)" : "var(--muted)",
                cursor: "pointer",
              }}
            >
              {m === "plain" ? "Plain text" : "Basic formatting only"}
            </button>
          ))}
        </div>
        <label style={fieldLabelStyle}>Cleaned result</label>
        <div ref={outputRef} contentEditable suppressContentEditableWarning data-placeholder="Cleaned text will appear here once you paste something above." style={editableStyle} />
        {outStats && (
          <div style={statLineStyle}>
            {outStats.chars !== undefined ? (
              <span><b>{outStats.chars}</b> characters</span>
            ) : (
              <span><b>{outStats.stripped}</b> style/tag{outStats.stripped === 1 ? "" : "s"} removed</span>
            )}
            <span>{outStats.note}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button onClick={copyOutput} disabled={!hasContent} className="primary-btn" style={btnStyle(!hasContent)}>
          Copy cleaned text
        </button>
        <button onClick={clearAll} style={ghostBtnStyle}>
          <RotateCcw size={14} /> Clear
        </button>
      </div>

      <StatusBanner status={status} />
    </div>
  );
}

/* ---------------------------------------------------------
   Shared small pieces + styles
--------------------------------------------------------- */

function PreviewFigure({ src, label, size, extra }) {
  return (
    <figure style={{ flex: "1 1 200px", margin: 0, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
      <img src={src} alt={label} style={{ maxWidth: "100%", maxHeight: "180px", borderRadius: "6px" }} />
      <figcaption style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>
        {label} · <b style={{ color: "var(--ink)" }}>{size}</b>{extra ? ` · ${extra}` : ""}
      </figcaption>
    </figure>
  );
}

const thStyle = {
  textAlign: "left", fontSize: "10.5px", letterSpacing: "0.06em", textTransform: "uppercase",
  color: "var(--muted)", fontWeight: 600, padding: "6px 10px 6px 0", borderBottom: "1px solid var(--ink)",
};
const tdKeyStyle = { color: "var(--muted)", padding: "7px 10px 7px 0", borderBottom: "1px solid var(--line)", width: "40%" };
const tdValStyle = { fontWeight: 500, padding: "7px 10px 7px 0", borderBottom: "1px solid var(--line)", wordBreak: "break-word", color: "var(--graphite)" };
const fieldLabelStyle = { display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--muted)", marginBottom: "6px" };
const selectStyle = { width: "100%", padding: "9px 10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--white)", color: "var(--graphite)", fontFamily: "'Inter', sans-serif", fontSize: "14px" };
const editableStyle = {
  width: "100%", minHeight: "140px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "14.5px",
  lineHeight: 1.6, color: "var(--graphite)", border: "1px solid var(--line)", borderRadius: "10px",
  background: "var(--white)", padding: "14px 16px", overflowY: "auto",
};
const statLineStyle = { display: "flex", gap: "18px", flexWrap: "wrap", fontSize: "12.5px", color: "var(--muted)", marginTop: "10px" };
const ghostBtnStyle = {
  display: "flex", alignItems: "center", gap: "7px", background: "transparent",
  border: "1px solid var(--line)", borderRadius: "10px", padding: "10px 16px",
  fontSize: "13.5px", fontWeight: 600, color: "var(--graphite)", cursor: "pointer", fontFamily: "'Inter', sans-serif",
};
function btnStyle(disabled) {
  return {
    display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px",
    fontSize: "13.5px", fontWeight: 600, borderRadius: "10px", border: "none",
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif",
  };
}
