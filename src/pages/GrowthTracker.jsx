import { useState, useEffect, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

const STORAGE_PREFIX = "groundwork:growth-tracker:";

const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtShort = (n) => {
  const r = Math.round(n);
  if (Math.abs(r) >= 1000000) return "$" + (r / 1000000).toFixed(1) + "M";
  if (Math.abs(r) >= 1000) return "$" + Math.round(r / 1000) + "K";
  return "$" + r;
};

function computeSeries(start, monthly, ratePct, years) {
  const monthlyRate = ratePct / 100 / 12;
  let balance = start;
  let contributed = start;
  const points = [{ year: 0, balance, contributed, growth: 0 }];
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthly;
      contributed += monthly;
    }
    points.push({ year: y, balance, contributed, growth: balance - contributed });
  }
  return points;
}

// Reads/writes saved scenarios to the browser's own localStorage. Unlike the
// Claude-artifact `window.storage` API this replaces, this only persists on
// this one browser/device — there's no account system or cross-device sync.
function loadSavedAssets() {
  const items = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        try {
          items.push(JSON.parse(localStorage.getItem(key)));
        } catch (e) {}
      }
    }
  } catch (e) {}
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return items;
}

export default function GrowthTracker() {
  usePageTitle("Growth Tracker — Groundwork");

  const [start, setStart] = useState(10000);
  const [monthly, setMonthly] = useState(400);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(15);
  const [assetName, setAssetName] = useState("");
  const [saveStatus, setSaveStatus] = useState({ text: "", isError: false });
  const [savedAssets, setSavedAssets] = useState([]);

  useEffect(() => {
    setSavedAssets(loadSavedAssets());
  }, []);

  const points = useMemo(() => computeSeries(start, monthly, rate, years), [start, monthly, rate, years]);
  const last = points[points.length - 1];

  const tableRows = useMemo(() => {
    const step = Math.ceil(points.length / 12) || 1;
    const seen = new Set();
    const rows = [];
    points.forEach((p, i) => {
      const include = i === 0 || i % step === 0 || i === points.length - 1;
      if (include && !seen.has(p.year)) {
        seen.add(p.year);
        rows.push(p);
      }
    });
    return rows;
  }, [points]);

  const chart = useMemo(() => {
    const w = 460, h = 170, pad = 8;
    const max = Math.max(...points.map((p) => p.balance)) || 1;
    const xStep = (w - pad * 2) / (points.length - 1 || 1);
    const yFor = (v) => h - pad - (v / max) * (h - pad * 2);
    let path = "";
    points.forEach((p, i) => {
      const x = pad + i * xStep;
      const y = yFor(p.balance);
      path += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
    });
    const lastX = pad + (points.length - 1) * xStep;
    const lastY = yFor(last.balance);
    const areaPath = path + `L${lastX.toFixed(1)},${h - pad} L${pad},${h - pad} Z`;
    return { w, h, pad, path: path.trim(), areaPath, lastX, lastY };
  }, [points, last]);

  function handleSave() {
    const name = assetName.trim();
    if (!name) {
      setSaveStatus({ text: "Name this scenario before saving.", isError: true });
      return;
    }
    const id = STORAGE_PREFIX + Date.now();
    const record = { key: id, name, start, monthly, rate, years, createdAt: Date.now() };
    try {
      localStorage.setItem(id, JSON.stringify(record));
      setSaveStatus({ text: `Saved "${name}".`, isError: false });
      setAssetName("");
      setSavedAssets(loadSavedAssets());
    } catch (e) {
      setSaveStatus({ text: "Could not save — try again.", isError: true });
    }
  }

  function handleLoad(asset) {
    setStart(asset.start);
    setMonthly(asset.monthly);
    setRate(asset.rate);
    setYears(asset.years);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(asset) {
    try {
      localStorage.removeItem(asset.key);
      setSavedAssets(loadSavedAssets());
    } catch (e) {}
  }

  return (
    <div className="font-body" style={{ background: "var(--paper)", color: "var(--graphite)", minHeight: "100%" }}>
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
            <TrendingUp size={13} /> GROWTH TRACKER
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
            See where compound growth actually takes you
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "var(--muted)", maxWidth: "580px" }}>
            Adjust your starting amount, monthly contribution, growth rate, and time horizon —
            watch the projection update live. Save scenarios to come back to later.
          </p>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 32px" }}>
        <div
          className="responsive-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.15fr",
            gap: "18px",
            alignItems: "stretch",
          }}
        >
          {/* Inputs panel */}
          <div className="bracket-panel" style={{ background: "var(--white)", padding: "24px 26px" }}>
            <SliderField label="Starting amount" value={fmt(start)}>
              <input type="range" min="0" max="200000" step="500" value={start}
                onChange={(e) => setStart(parseFloat(e.target.value))} style={sliderStyle} />
            </SliderField>
            <SliderField label="Monthly contribution" value={fmt(monthly) + "/mo"}>
              <input type="range" min="0" max="5000" step="25" value={monthly}
                onChange={(e) => setMonthly(parseFloat(e.target.value))} style={sliderStyle} />
            </SliderField>
            <SliderField label="Annual growth rate" value={rate.toFixed(1) + "%"}>
              <input type="range" min="0" max="20" step="0.1" value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))} style={sliderStyle} />
            </SliderField>
            <SliderField label="Time horizon" value={years + (years === 1 ? " year" : " years")} last>
              <input type="range" min="1" max="40" step="1" value={years}
                onChange={(e) => setYears(parseInt(e.target.value))} style={sliderStyle} />
            </SliderField>
          </div>

          {/* Result panel */}
          <div className="bracket-panel" style={{ background: "var(--white)", padding: "24px 26px" }}>
            <div style={smallLabelStyle}>Projected value</div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: "44px",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                margin: "6px 0 4px",
                color: "var(--ink)",
              }}
            >
              {fmt(last.balance)}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", color: "var(--muted)" }}>
              after {years} {years === 1 ? "year" : "years"} — of which{" "}
              <b style={{ color: "var(--blue)", fontWeight: 600 }}>{fmt(last.contributed)}</b> is your own
              contribution
            </div>

            <div style={{ marginTop: "16px" }}>
              <svg viewBox="0 0 460 170" width="100%" height="170" preserveAspectRatio="none">
                <polyline
                  points={`${chart.pad},${chart.h - chart.pad} ${chart.w - chart.pad},${chart.h - chart.pad}`}
                  stroke="var(--ink)" strokeWidth="1" opacity="0.2"
                />
                <path d={chart.areaPath} fill="var(--blue)" opacity="0.10" stroke="none" />
                <path d={chart.path} fill="none" stroke="var(--ink)" strokeWidth="2" />
                <polygon
                  points={`${chart.lastX - 6},${chart.lastY + 7} ${chart.lastX + 6},${chart.lastY + 7} ${chart.lastX},${chart.lastY - 6}`}
                  fill="var(--blue)"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bracket-panel" style={{ background: "var(--white)", padding: "24px 26px", marginTop: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
            <div style={smallLabelStyle}>Year-by-year</div>
            <div style={{ ...smallLabelStyle, marginBottom: 0 }}>Values in nominal terms</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'IBM Plex Mono', monospace", fontSize: "12.5px" }}>
            <thead>
              <tr>
                {["Year", "Contributed", "Growth", "Balance"].map((h, i) => (
                  <th key={h} style={{
                    textAlign: i === 0 ? "left" : "right",
                    fontWeight: 500, color: "var(--muted)", fontSize: "10.5px",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    padding: "6px 4px", borderBottom: "1px solid var(--ink)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((p) => (
                <tr key={p.year}>
                  <td style={{ textAlign: "left", padding: "7px 4px", borderBottom: "1px solid var(--line)" }}>{p.year}</td>
                  <td style={{ textAlign: "right", padding: "7px 4px", borderBottom: "1px solid var(--line)" }}>{fmtShort(p.contributed)}</td>
                  <td style={{ textAlign: "right", padding: "7px 4px", borderBottom: "1px solid var(--line)" }}>{fmtShort(p.growth)}</td>
                  <td style={{ textAlign: "right", padding: "7px 4px", borderBottom: "1px solid var(--line)", fontWeight: 500 }}>{fmtShort(p.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Save */}
        <div className="bracket-panel" style={{ background: "var(--white)", padding: "24px 26px", marginTop: "18px" }}>
          <div style={smallLabelStyle}>Save this scenario</div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text" value={assetName} onChange={(e) => setAssetName(e.target.value)}
              placeholder="Name this scenario — e.g. Retirement fund"
              style={{
                flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: "14px",
                padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "8px",
                background: "var(--white)", color: "var(--graphite)",
              }}
            />
            <button onClick={handleSave} className="primary-btn" style={{ padding: "11px 22px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Save
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "var(--muted)", margin: "10px 0 0" }}>
            Saved only in this browser — clearing your browser data will remove it.
          </p>
          {saveStatus.text && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", marginTop: "6px", color: saveStatus.isError ? "var(--red)" : "var(--muted)" }}>
              {saveStatus.text}
            </div>
          )}
        </div>

        {/* Saved list */}
        <div className="bracket-panel" style={{ background: "var(--white)", padding: "24px 26px", marginTop: "18px" }}>
          <div style={smallLabelStyle}>Your saved scenarios</div>
          {savedAssets.length === 0 ? (
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12.5px", color: "var(--muted)", margin: "8px 0 0" }}>
              Nothing saved yet. Build a scenario above and save it.
            </p>
          ) : (
            <div style={{ marginTop: "8px" }}>
              {savedAssets.map((a) => (
                <div key={a.key} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 4px", borderBottom: "1px solid var(--line)",
                }}>
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "14px" }}>{a.name}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11.5px", color: "var(--muted)", marginTop: "2px" }}>
                      {fmt(a.start)} start · {fmt(a.monthly)}/mo · {a.rate}% · {a.years}y
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleLoad(a)} style={ghostBtnStyle}>Load</button>
                    <button onClick={() => handleDelete(a)} style={{ ...ghostBtnStyle, color: "var(--red)" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />
      <SiteFooter />
    </div>
  );
}

const smallLabelStyle = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted)",
  marginBottom: "6px",
};

const sliderStyle = {
  width: "100%",
  accentColor: "var(--blue)",
};

const ghostBtnStyle = {
  background: "transparent",
  border: "1px solid var(--line)",
  borderRadius: "8px",
  padding: "6px 12px",
  fontSize: "11px",
  color: "var(--muted)",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
};

function SliderField({ label, value, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : "18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ ...smallLabelStyle, marginBottom: 0, textTransform: "none", letterSpacing: 0, fontFamily: "'Inter', sans-serif", fontSize: "12.5px" }}>
          {label}
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
          {value}
        </span>
      </div>
      {children}
    </div>
  );
}
