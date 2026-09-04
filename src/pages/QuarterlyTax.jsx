import { useState, useMemo } from "react";
import { Receipt } from "lucide-react";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

const fmt = (n) => "$" + Math.round(Math.max(0, n)).toLocaleString("en-US");

function currentQuarterIndex() {
  const now = new Date();
  const y = now.getFullYear();
  const dues = [
    new Date(y, 3, 15), // Apr 15 - Q1
    new Date(y, 5, 15), // Jun 15 - Q2
    new Date(y, 8, 15), // Sep 15 - Q3
    new Date(y + 1, 0, 15), // Jan 15 - Q4
  ];
  for (let i = 0; i < dues.length; i++) {
    if (now < dues[i]) return i;
  }
  return -1;
}

const QUARTERS = [
  { key: "q1", label: "Q1", due: "Apr 15" },
  { key: "q2", label: "Q2", due: "Jun 15" },
  { key: "q3", label: "Q3", due: "Sep 15" },
  { key: "q4", label: "Q4", due: "Jan 15" },
];

export default function QuarterlyTax() {
  usePageTitle("Quarterly Tax Calculator — Groundwork");

  const [netIncome, setNetIncome] = useState(90000);
  const [incomeTaxRate, setIncomeTaxRate] = useState(18);
  const [seTaxRate, setSeTaxRate] = useState(15.3);
  const [stateTaxRate, setStateTaxRate] = useState(5);

  const result = useMemo(() => {
    const combinedRate = (incomeTaxRate + seTaxRate + stateTaxRate) / 100;
    const annualTotal = Math.max(0, netIncome) * combinedRate;
    const perQuarter = annualTotal / 4;
    const curIdx = currentQuarterIndex();
    return { annualTotal, perQuarter, curIdx };
  }, [netIncome, incomeTaxRate, seTaxRate, stateTaxRate]);

  return (
    <div className="font-body" style={{ background: "var(--paper)", color: "var(--graphite)", minHeight: "100%" }}>
      <SiteHeader />

      <div className="grid-bg" style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "36px 32px 28px" }}>
          <div style={eyebrowStyle}>
            <Receipt size={13} /> QUARTERLY TAX
          </div>
          <h1 style={h1Style}>Your quarterly tax coupon booklet</h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "var(--muted)", maxWidth: "620px" }}>
            Self-employment income isn't withheld automatically — most tax authorities expect
            payments through the year, not one lump sum. This splits what you owe into the
            standard U.S. quarterly due dates.
          </p>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "28px 32px" }}>
        <div className="bracket-panel" style={{ background: "var(--white)", padding: "8px 26px 4px", marginBottom: "22px" }}>
          <NumberField
            label="Expected net self-employment income"
            hint="Revenue minus business expenses, for the year."
            prefix="$"
            value={netIncome}
            onChange={setNetIncome}
            step={1000}
          />
          <NumberField label="Federal income tax rate" hint="Your estimated effective bracket." value={incomeTaxRate} onChange={setIncomeTaxRate} step={0.5} suffix="%" />
          <NumberField label="Self-employment tax rate" hint="Social Security + Medicare — 15.3% is standard in the U.S." value={seTaxRate} onChange={setSeTaxRate} step={0.1} suffix="%" />
          <NumberField label="State/provincial tax rate" hint="Set to 0 if yours has no income tax." value={stateTaxRate} onChange={setStateTaxRate} step={0.5} suffix="%" last />

          <div style={{ padding: "18px 0 22px", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
            <div style={smallLabelStyle}>Total estimated tax owed this year</div>
            <div className="font-display" style={{ fontWeight: 800, fontSize: "26px", color: "var(--red)" }}>
              {fmt(result.annualTotal)}
            </div>
          </div>
        </div>

        <div style={{ ...smallLabelStyle, textAlign: "center", marginBottom: "14px" }}>
          One payment per due date
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }} className="responsive-grid">
          {QUARTERS.map((q, i) => {
            const isCurrent = i === result.curIdx;
            const isPast = result.curIdx === -1 || i < result.curIdx;
            let stampLabel = "Upcoming";
            if (isCurrent) stampLabel = "Next due";
            else if (isPast) stampLabel = "Past due date";

            return (
              <div
                key={q.key}
                className="bracket-panel"
                style={{
                  background: "var(--white)",
                  padding: 0,
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 18px 10px" }}>
                  <div className="font-display" style={{ fontWeight: 700, fontSize: "17px", color: "var(--ink)" }}>{q.label}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10.5px", color: "var(--muted)", textAlign: "right", lineHeight: 1.4 }}>
                    DUE<br />{q.due}
                  </div>
                </div>
                <div style={{ padding: "4px 18px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div style={{ ...smallLabelStyle, fontSize: "10px", marginBottom: "4px" }}>Amount due</div>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: "20px", color: "var(--ink)" }}>{fmt(result.perQuarter)}</div>
                  </div>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: isCurrent ? "var(--blue)" : isPast ? "var(--muted)" : "var(--muted)",
                      border: `1.5px solid ${isCurrent ? "var(--blue)" : "var(--line)"}`,
                      borderRadius: "6px",
                      padding: "3px 8px",
                    }}
                  >
                    {stampLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p style={footnoteStyle}>
          <b style={{ color: "var(--graphite)" }}>How this is worked out:</b> your net income is taxed at
          the combined federal, self-employment, and state rates you set, then split into four equal
          payments on the standard U.S. estimated-tax due dates. This is a planning estimate, not a
          filing — actual brackets are progressive and your real liability may differ, and due dates
          vary outside the U.S. Confirm with a tax professional before paying.
        </p>
      </div>

      <AdSlot label="Advertisement" height={90} />
      <SiteFooter />
    </div>
  );
}

const eyebrowStyle = {
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
};

const h1Style = {
  fontFamily: "'Inter', sans-serif",
  fontWeight: 700,
  fontSize: "32px",
  margin: 0,
  letterSpacing: "-0.015em",
  color: "var(--ink)",
};

const smallLabelStyle = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

const footnoteStyle = {
  maxWidth: "700px",
  margin: "26px auto 0",
  fontSize: "13px",
  lineHeight: 1.65,
  color: "var(--muted)",
  textAlign: "center",
};

function NumberField({ label, hint, prefix, suffix, value, onChange, step, last }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 140px", alignItems: "center", gap: "16px",
      padding: "16px 0", borderBottom: last ? "none" : "1px solid var(--line-soft)",
    }}>
      <label style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.35, color: "var(--graphite)" }}>
        {label}
        <span style={{ display: "block", fontWeight: 400, fontSize: "12px", color: "var(--muted)", marginTop: "3px" }}>{hint}</span>
      </label>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {prefix && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", color: "var(--muted)", marginRight: "5px" }}>{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{
            width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: "16px",
            fontWeight: 600, color: "var(--ink)", background: "transparent", border: "none",
            borderBottom: "1.5px solid var(--line)", padding: "4px 2px 6px", textAlign: "right", outline: "none",
          }}
        />
        {suffix && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", color: "var(--muted)", marginLeft: "5px" }}>{suffix}</span>}
      </div>
    </div>
  );
}
