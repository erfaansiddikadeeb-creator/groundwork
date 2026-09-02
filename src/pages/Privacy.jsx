import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

export default function Privacy() {
  usePageTitle("Privacy Policy — Groundwork");
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
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 500,
            fontSize: "28px",
            marginBottom: "8px",
            color: "var(--ink)",
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "28px" }}>
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div style={{ fontSize: "14.5px", lineHeight: 1.7, color: "var(--graphite)" }}>
          <p>
            Groundwork ("we", "our", "the site") provides free tools, including a resume tailor
            and a contract checker. This page explains what happens to the information you enter.
          </p>

          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", marginTop: "26px" }}>
            What you submit
          </h2>
          <p>
            When you use a tool on this site, the text you paste (such as a resume, job posting,
            or contract) is sent to our server, which forwards it to a third-party AI provider
            (OpenAI) to generate a response. We do not require an account, and we do not ask for
            your name, email, or other identifying information to use any tool.
          </p>
          <p>
            We do not permanently store the content you submit. It is used only to generate your
            result and is not saved to a database or shared with anyone beyond the AI provider
            processing the request.
          </p>

          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", marginTop: "26px" }}>
            Automatically collected information
          </h2>
          <p>
            Like most websites, our hosting provider (Vercel) and any advertising partners (such
            as Google AdSense, once enabled) may automatically collect standard technical
            information — such as IP address, browser type, and pages visited — for security,
            performance, and advertising purposes. We use IP addresses internally to apply a
            simple daily usage limit per visitor, preventing abuse of the free tools.
          </p>

          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", marginTop: "26px" }}>
            Advertising & cookies
          </h2>
          <p>
            This site may display ads served by Google AdSense. Google and its partners may use
            cookies to serve ads based on your prior visits to this or other websites. You can
            opt out of personalized advertising by visiting{" "}
            <a href="https://adssettings.google.com" target="_blank" rel="noreferrer" style={{ color: "var(--blue)" }}>
              Google's Ads Settings
            </a>
            .
          </p>

          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", marginTop: "26px" }}>
            Third-party services
          </h2>
          <p>
            We use OpenAI's API to generate tool results, and Vercel to host this site. Each of
            these providers has its own privacy practices governing data they process on our
            behalf.
          </p>

          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", marginTop: "26px" }}>
            Not legal or professional advice
          </h2>
          <p>
            Tools on this site (including the contract checker) provide general, automated
            information only and are not a substitute for advice from a qualified professional.
          </p>

          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", marginTop: "26px" }}>
            Contact
          </h2>
          <p>
            Questions about this policy can be directed to the site owner via the contact
            information provided on our social/launch posts.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
