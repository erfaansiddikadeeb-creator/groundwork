import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

export default function Terms() {
  usePageTitle("Terms of Use — Fixyorio");
  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        background: "var(--paper)",
        color: "var(--graphite)",
        minHeight: "100%",
      }}
    >
      <SiteHeader />
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 32px 60px" }}>
        <h1
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: "28px",
            marginBottom: "8px",
            color: "var(--ink)",
          }}
        >
          Terms of Use
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "28px" }}>
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div style={{ fontSize: "14.5px", lineHeight: 1.7, color: "var(--graphite)" }}>
          <p>
            These terms govern your use of Fixyorio ("we", "our", "the site") and its tools,
            including Resume Tailor, Contract Checker, Growth Tracker, Salary vs Contract, Rate
            Calculator, and Quarterly Tax. By using this site, you agree to these terms. If you
            don't agree, please don't use the site.
          </p>

          <h2 style={sectionStyle}>What this site is</h2>
          <p>
            Fixyorio provides free, automated tools that generate estimates, drafts, and
            informational summaries based on what you enter. Some tools use AI to generate text
            (resume bullets, cover letters, contract summaries); others are plain calculators
            (growth projections, rate estimates, tax splits). None of these tools connect to a
            professional service, database of legal or financial records, or licensed advisor —
            they process what you type or upload and return a result.
          </p>

          <h2 style={sectionStyle}>Not professional advice</h2>
          <p>
            Nothing on this site is legal, financial, tax, or career advice, and using a tool here
            does not create any professional relationship between you and Fixyorio. Contract
            Checker does not replace review by a licensed attorney. Growth Tracker, Salary vs
            Contract, Rate Calculator, and Quarterly Tax produce planning estimates only, not
            filing-ready figures or investment recommendations. Resume Tailor's suggestions are
            starting drafts for you to review and edit, not guaranteed-accurate or
            guaranteed-effective content. Always verify anything significant with a qualified
            professional before acting on it — especially before signing a contract, filing taxes,
            or making a financial decision.
          </p>

          <h2 style={sectionStyle}>Accuracy and AI-generated content</h2>
          <p>
            Tools that use AI (Resume Tailor, Contract Checker) can make mistakes, miss details,
            or misread text — including text extracted from photos. We've tuned these tools
            carefully and tested them against real examples, but we cannot guarantee any output is
            complete, accurate, or suitable for your specific situation. You're responsible for
            reviewing and verifying anything a tool generates before relying on it or sending it
            to someone else (an employer, a landlord, a client, etc).
          </p>

          <h2 style={sectionStyle}>Acceptable use</h2>
          <p>You agree not to:</p>
          <ul style={{ paddingLeft: "22px", margin: "10px 0" }}>
            <li>Use the tools to generate content intended to deceive, defraud, or impersonate someone else</li>
            <li>Attempt to bypass the usage limits in place on each tool (for example, by automating requests or spoofing your identity to the server)</li>
            <li>Upload or paste content you don't have the right to share, or that contains someone else's sensitive personal information without their consent</li>
            <li>Use the site in any way that could damage, disable, or overburden it, or interfere with anyone else's use of it</li>
          </ul>
          <p>
            We may limit or block access for anyone we reasonably believe is violating these
            terms.
          </p>

          <h2 style={sectionStyle}>Your content</h2>
          <p>
            You retain all rights to whatever you paste, upload, or photograph and submit to a
            tool (your resume, a contract, financial figures, etc). We don't claim any ownership
            over it. As described in our{" "}
            <Link to="/privacy" style={{ color: "var(--blue)" }}>
              Privacy Policy
            </Link>
            , this content is sent to a third-party AI provider to generate your result and is not
            permanently stored by us afterward.
          </p>

          <h2 style={sectionStyle}>No warranty, limitation of liability</h2>
          <p>
            This site and its tools are provided "as is," without warranties of any kind, express
            or implied — including any warranty that a tool will be accurate, uninterrupted, or
            error-free. To the fullest extent permitted by law, Fixyorio and its owner are not
            liable for any damages or losses arising from your use of this site or reliance on any
            tool's output, including decisions made based on a resume, cover letter, contract
            summary, or financial estimate generated here.
          </p>

          <h2 style={sectionStyle}>Availability and changes</h2>
          <p>
            We may modify, suspend, or discontinue any tool or feature at any time, including
            usage limits, without notice. We may also update these terms as the site changes;
            continued use after an update means you accept the revised terms.
          </p>

          <h2 style={sectionStyle}>Third-party services</h2>
          <p>
            This site relies on third-party providers — including OpenAI for AI-generated content
            and Vercel for hosting — each governed by their own terms. We're not responsible for
            outages, errors, or changes originating from these providers.
          </p>

          <h2 style={sectionStyle}>Contact</h2>
          <p>
            Questions about these terms can be directed to the site owner via the contact
            information provided on our social/launch posts.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

const sectionStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "18px",
  marginTop: "26px",
};
