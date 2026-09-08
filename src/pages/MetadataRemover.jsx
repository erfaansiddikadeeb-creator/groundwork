import { useState } from "react";
import { ShieldOff, Download, RotateCcw } from "lucide-react";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

/* ---------------------------------------------------------
   Pure helpers — decode any supported image, read EXIF/GPS
   when present, and hand back a ready-to-draw canvas.
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

/* --------------------------------------------------------- */

function Dropzone({ onFile, title, hint, accept }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onClick={() => document.getElementById("mdz-input")?.click()}
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
        id="mdz-input"
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

export default function MetadataRemover() {
  usePageTitle(
    "Remove Photo Metadata — Fixyorio",
    "Free tool to strip EXIF and GPS location data from a photo before you share it. Runs entirely in your browser — nothing is uploaded."
  );

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
            <ShieldOff size={13} /> METADATA REMOVER
          </div>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "32px", margin: 0, letterSpacing: "-0.015em", color: "var(--ink)" }}>
            Remove hidden data from a photo before you share it
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "var(--muted)", maxWidth: "620px" }}>
            Photos from phones and cameras often carry the device model, the exact time taken,
            and sometimes GPS coordinates. This reads what's embedded, then re-encodes the image
            from scratch so none of it survives — entirely in your browser, nothing uploaded.
          </p>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "28px 32px" }}>
        <div className="bracket-panel" style={{ background: "var(--white)", padding: "26px" }}>
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
                  style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 18px", fontSize: "13.5px", fontWeight: 600, borderRadius: "10px", border: "none", cursor: outputBlob ? "pointer" : "not-allowed", fontFamily: "'Inter', sans-serif" }}
                >
                  <Download size={14} /> Download cleaned photo
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

const thStyle = {
  textAlign: "left", fontSize: "10.5px", letterSpacing: "0.06em", textTransform: "uppercase",
  color: "var(--muted)", fontWeight: 600, padding: "6px 10px 6px 0", borderBottom: "1px solid var(--ink)",
};
const tdKeyStyle = { color: "var(--muted)", padding: "7px 10px 7px 0", borderBottom: "1px solid var(--line)", width: "40%" };
const tdValStyle = { fontWeight: 500, padding: "7px 10px 7px 0", borderBottom: "1px solid var(--line)", wordBreak: "break-word", color: "var(--graphite)" };
