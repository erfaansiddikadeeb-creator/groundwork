import { useState, useMemo } from "react";
import { Calculator } from "lucide-react";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");

export default function RateCalculator() {
  usePageTitle("Rate Calculator — Fixyorio");

  const [income, setIncome] = useState(80000);
  const [expenses, setExpenses] = useState(6000);
  const [taxRate, setTaxRate] = useState(28);
  const [billableHours, setBillableHours] = useState(25);
  const [weeksWorked, setWeeksWorked] = useState(46);
  const [buffer, setBuffer] = useState(10);

  const result = useMemo(() => {
    const taxFrac = taxRate / 100;
    const bufferFrac = buffer / 100;

    // Business expenses are typically tax-deductible, so they shouldn't be
    // grossed up for tax the same way take-home income is — only the
    // take-home portion needs to cover the tax bill. Expenses are added on
    // top of that pre-tax figure, not folded into the same tax calculation.
    const preTaxIncomeNeeded = taxFrac < 1 ? income / (1 - taxFrac) : income;
    const revenueBeforeBuffer = preTaxIncomeNeeded + expenses;
    const revenueNeeded = revenueBeforeBuffer * (1 + bufferFrac);

    const totalHours = billableHours * weeksWorked;
    const hourlyRate = totalHours > 0 ? revenueNeeded / totalHours : 0;

    return {
      hourlyRate,
      dayRate: hourlyRate * 8,
      revenueNeeded,
    };
  }, [income, expenses, taxRate, billableHours, weeksWorked, buffer]);

  return (
    <div className="font-body" style={{ background: "var(--paper)", color: "var(--graphite)", minHeight: "100%" }}>
      <SiteHeader />

      <div className="grid-bg" style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "36px 32px 28px" }}>
          <div style={eyebrowStyle}>
            <Calculator size={13} /> RATE CALCULATOR
          </div>
          <h1 style={h1Style}>What should you actually charge?</h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "var(--muted)", maxWidth: "600px" }}>
            Most freelance rates are guesses. This works backward from the income you actually
            want to keep, after tax, after time off, after the hours that never get billed.
          </p>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "28px 32px" }}>
        <div className="bracket-panel" style={{ background: "var(--white)", padding: "8px 26px 4px" }}>
          <NumberField
            label="Take-home income you want this year"
            hint="After tax, in your pocket — not revenue."
            prefix="$"
            value={income}
            onChange={setIncome}
            step={1000}
          />
          <NumberField
            label="Annual business expenses"
            hint="Software, insurance, equipment, coworking, contractors."
            prefix="$"
            value={expenses}
            onChange={setExpenses}
            step={500}
          />
          <RangeField label="Effective tax rate" hint="Income tax + self-employment tax, combined estimate." value={taxRate} onChange={setTaxRate} min={0} max={50} suffix="%" />
          <RangeField label="Billable hours per week" hint="Only hours you invoice — not admin, sales, or email." value={billableHours} onChange={setBillableHours} min={5} max={45} />
          <RangeField label="Weeks worked per year" hint="52 minus vacation, sick days, and slow weeks." value={weeksWorked} onChange={setWeeksWorked} min={20} max={52} />
          <RangeField label="Buffer for risk & downtime" hint="Covers slow months, scope creep, and unpaid invoices." value={buffer} onChange={setBuffer} min={0} max={30} suffix="%" last />

          <div
            style={{
              marginTop: "6px",
              padding: "22px 0 24px",
              borderTop: "2px solid var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={smallLabelStyle}>Minimum rate to charge</div>
              <div className="font-display" style={{ fontWeight: 800, fontSize: "clamp(32px, 6vw, 44px)", color: "var(--ink)", marginTop: "4px" }}>
                {fmt(result.hourlyRate)}
                <small style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, color: "var(--muted)", marginLeft: "6px" }}>
                  / hour
                </small>
              </div>
            </div>
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div style={{ textAlign: "right" }}>
                <div style={smallLabelStyle}>Day rate (8h)</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: "17px", color: "var(--ink)", marginTop: "3px" }}>
                  {fmt(result.dayRate)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={smallLabelStyle}>Annual revenue needed</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: "17px", color: "var(--ink)", marginTop: "3px" }}>
                  {fmt(result.revenueNeeded)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p style={footnoteStyle}>
          <b style={{ color: "var(--graphite)" }}>How this is worked out:</b> your take-home target is
          grossed up for tax, then your (already pre-tax, deductible) business expenses are added on top —
          then a risk buffer is applied to the whole figure to find the revenue you need. That's divided
          by the hours you'll realistically bill in a year. Treat the tax rate as a planning estimate, not
          filing advice — check it against your own bracket and jurisdiction.
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

function NumberField({ label, hint, prefix, value, onChange, step, last }) {
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
      </div>
    </div>
  );
}

function RangeField({ label, hint, value, onChange, min, max, suffix, last }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 140px", alignItems: "center", gap: "16px",
      padding: "16px 0", borderBottom: last ? "none" : "1px solid var(--line-soft)",
    }}>
      <label style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.35, color: "var(--graphite)" }}>
        {label}
        <span style={{ display: "block", fontWeight: 400, fontSize: "12px", color: "var(--muted)", marginTop: "3px" }}>{hint}</span>
      </label>
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "4px" }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: "15px", color: "var(--ink)" }}>
            {value}{suffix || ""}
          </span>
        </div>
        <input
          type="range" min={min} max={max} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: "var(--blue)" }}
        />
      </div>
    </div>
  );
}
