import { useState, useMemo } from "react";
import { Scale } from "lucide-react";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AdSlot from "../components/AdSlot.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

const fmt = (n) => (n < 0 ? "-$" : "$") + Math.round(Math.abs(n)).toLocaleString("en-US");

export default function SalaryVsContract() {
  usePageTitle("Salary vs Contract — Groundwork");

  const [salary, setSalary] = useState(95000);
  const [healthValue, setHealthValue] = useState(7000);
  const [matchPct, setMatchPct] = useState(4);
  const [paidDays, setPaidDays] = useState(23);

  const [hourlyRate, setHourlyRate] = useState(60);
  const [hoursWeek, setHoursWeek] = useState(35);
  const [weeksYear, setWeeksYear] = useState(46);
  const [selfCosts, setSelfCosts] = useState(9000);

  const result = useMemo(() => {
    const salaryTotal = salary + healthValue + salary * (matchPct / 100);
    const workingDays = Math.max(1, 260 - paidDays);
    const salaryPerDay = salaryTotal / workingDays;

    const contractGross = hourlyRate * hoursWeek * weeksYear;
    const contractTotal = contractGross - selfCosts;
    const contractDays = Math.max(1, (hoursWeek * weeksYear) / 8);
    const contractPerDay = contractTotal / contractDays;

    const diff = contractTotal - salaryTotal;
    let verdict, winner;
    if (Math.abs(diff) < 250) {
      verdict = "These two offers land within a few hundred dollars of each other — close enough that the decision should probably come down to stability, flexibility, or growth, not the number.";
      winner = null;
    } else if (diff > 0) {
      verdict = "The contract offer is worth more per year, even after covering your own benefits and buffer.";
      winner = "contract";
    } else {
      verdict = "The salaried offer is worth more per year once benefits and paid time off are counted in.";
      winner = "salary";
    }

    return { salaryTotal, salaryPerDay, workingDays, contractTotal, contractPerDay, contractDays, diff, verdict, winner };
  }, [salary, healthValue, matchPct, paidDays, hourlyRate, hoursWeek, weeksYear, selfCosts]);

  return (
    <div className="font-body" style={{ background: "var(--paper)", color: "var(--graphite)", minHeight: "100%" }}>
      <SiteHeader />

      <div className="grid-bg" style={{ borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "36px 32px 28px" }}>
          <div style={eyebrowStyle}>
            <Scale size={13} /> SALARY VS CONTRACT
          </div>
          <h1 style={h1Style}>Which offer is actually worth more?</h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "var(--muted)", maxWidth: "600px" }}>
            A salary and a contract rate aren't directly comparable — one comes with benefits and paid
            time off baked in, the other doesn't. This weighs both down to what actually lands in your
            pocket per year.
          </p>
        </div>
      </div>

      <AdSlot label="Advertisement" height={90} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }} className="responsive-grid">
          {/* Salary card */}
          <div className="bracket-panel" style={{ background: "var(--white)", padding: "22px 24px" }}>
            <CardHeader title="The Salaried Offer" kicker="W-2 employment" dotColor="var(--red)" winner={result.winner === "salary"} />
            <NumberField label="Annual base salary" hint="Before tax, as stated in the offer." prefix="$" value={salary} onChange={setSalary} step={1000} />
            <NumberField label="Employer health insurance value" hint="What you'd pay yourself if self-funding it." prefix="$" value={healthValue} onChange={setHealthValue} step={250} />
            <NumberField label="401(k) match" hint="% of salary the employer contributes." suffix="%" value={matchPct} onChange={setMatchPct} step={0.5} />
            <NumberField label="Paid days off" hint="Vacation + sick + holidays, combined." value={paidDays} onChange={setPaidDays} step={1} last />
            <TotalBlock label="True annual value" value={fmt(result.salaryTotal)} />
            <p style={subStatStyle}>
              ≈ <b style={{ color: "var(--ink)" }}>{fmt(result.salaryPerDay)}</b> per day actually worked
              ({result.workingDays} working days/year, after PTO)
            </p>
          </div>

          {/* Contract card */}
          <div className="bracket-panel" style={{ background: "var(--white)", padding: "22px 24px" }}>
            <CardHeader title="The Contract Offer" kicker="1099 / independent" dotColor="var(--green)" winner={result.winner === "contract"} />
            <NumberField label="Hourly rate" hint="The number in the contract." prefix="$" value={hourlyRate} onChange={setHourlyRate} step={1} />
            <NumberField label="Billable hours per week" hint="Only hours you'll actually invoice." value={hoursWeek} onChange={setHoursWeek} step={1} />
            <NumberField label="Weeks worked per year" hint="52 minus unpaid time off, gaps between contracts." value={weeksYear} onChange={setWeeksYear} step={1} />
            <NumberField label="Extra self-funded costs" hint="Health insurance, gear, self-employment tax buffer." prefix="$" value={selfCosts} onChange={setSelfCosts} step={250} last />
            <TotalBlock label="True annual value" value={fmt(result.contractTotal)} />
            <p style={subStatStyle}>
              ≈ <b style={{ color: "var(--ink)" }}>{fmt(result.contractPerDay)}</b> per day actually worked
              ({Math.round(result.contractDays)} billed days/year)
            </p>
          </div>
        </div>

        {/* Verdict */}
        <div
          className="bracket-panel"
          style={{
            background: "var(--highlight-bg)",
            color: "var(--highlight-text)",
            padding: "24px 28px",
            marginTop: "18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: "600px" }}>
            <div style={{ ...smallLabelStyle, color: "var(--amber)", marginBottom: "8px" }}>The verdict</div>
            <div style={{ fontSize: "16px", lineHeight: 1.5 }}>{result.verdict}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              className="font-display"
              style={{
                fontWeight: 800,
                fontSize: "32px",
                color: result.winner === "contract" ? "var(--highlight-green)" : result.winner === "salary" ? "var(--highlight-red)" : "var(--highlight-text)",
              }}
            >
              {fmt(Math.abs(result.diff))}
            </div>
            <div style={{ ...smallLabelStyle, color: "var(--highlight-muted)", marginTop: "4px" }}>difference per year</div>
          </div>
        </div>

        <p style={footnoteStyle}>
          <b style={{ color: "var(--graphite)" }}>How this is worked out:</b> the salaried total adds the
          cash value of benefits to the base salary. The contract total starts from billable hours actually
          worked in a year, then subtracts costs you'd otherwise get for free as an employee. The "per day
          worked" figures account for paid time off separately, so they're not double-counted in the main
          total. Treat this as a planning estimate — your actual tax situation will shift both sides.
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

const subStatStyle = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "12px",
  color: "var(--muted)",
  margin: "10px 0 0",
};

const footnoteStyle = {
  maxWidth: "700px",
  margin: "26px auto 0",
  fontSize: "13px",
  lineHeight: 1.65,
  color: "var(--muted)",
  textAlign: "center",
};

function CardHeader({ title, kicker, dotColor, winner }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
      <div>
        <div className="font-display" style={{ fontWeight: 700, fontSize: "17px", color: "var(--ink)" }}>{title}</div>
        <div style={{ ...smallLabelStyle, marginTop: "4px" }}>{kicker}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {winner && (
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", letterSpacing: "0.06em",
            textTransform: "uppercase", color: "var(--green)", background: "var(--green-dim)",
            padding: "3px 8px", borderRadius: "6px", fontWeight: 600,
          }}>Better offer</span>
        )}
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: dotColor, marginTop: "2px" }} />
      </div>
    </div>
  );
}

function NumberField({ label, hint, prefix, suffix, value, onChange, step, last }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 110px", alignItems: "center", gap: "14px",
      padding: "13px 0", borderBottom: last ? "none" : "1px dashed var(--line)",
    }}>
      <label style={{ fontSize: "13.5px", fontWeight: 500, lineHeight: 1.35, color: "var(--graphite)" }}>
        {label}
        <span style={{ display: "block", fontWeight: 400, fontSize: "11.5px", color: "var(--muted)", marginTop: "3px" }}>{hint}</span>
      </label>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {prefix && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", color: "var(--muted)", marginRight: "4px" }}>{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          style={{
            width: "100%", maxWidth: "90px", fontFamily: "'IBM Plex Mono', monospace", fontSize: "15px",
            fontWeight: 600, color: "var(--ink)", background: "transparent", border: "none",
            borderBottom: "1.5px solid var(--line)", padding: "3px 2px 5px", textAlign: "right", outline: "none",
          }}
        />
        {suffix && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", color: "var(--muted)", marginLeft: "4px" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function TotalBlock({ label, value }) {
  return (
    <div style={{ marginTop: "8px", paddingTop: "16px", borderTop: "2px solid var(--ink)" }}>
      <div style={smallLabelStyle}>{label}</div>
      <div className="font-display" style={{ fontWeight: 800, fontSize: "28px", color: "var(--ink)", marginTop: "4px" }}>{value}</div>
    </div>
  );
}
