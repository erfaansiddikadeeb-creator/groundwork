import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <div style={{ borderTop: "1px solid var(--line)", marginTop: "20px" }}>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "22px 32px",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          fontSize: "12px",
          color: "var(--muted)",
        }}
        className="font-body"
      >
        <span>© {new Date().getFullYear()} Groundwork — practical tools for the paperwork of life.</span>
        <div style={{ display: "flex", gap: "18px" }}>
          <Link to="/" style={{ color: "var(--muted)", textDecoration: "none" }}>
            All tools
          </Link>
          <Link to="/privacy" style={{ color: "var(--muted)", textDecoration: "none" }}>
            Privacy
          </Link>
        </div>
      </div>
    </div>
  );
}
