import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import SiteHeader from "../components/SiteHeader.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

export default function NotFound() {
  usePageTitle("Page not found — Fixyorio");
  return (
    <div className="font-body" style={{ background: "var(--paper)", color: "var(--graphite)", minHeight: "100%" }}>
      <SiteHeader />
      <div
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          padding: "80px 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            margin: "0 auto 20px",
            borderRadius: "10px",
            background: "var(--blue-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Compass size={22} color="var(--blue)" />
        </div>
        <h1
          className="font-display"
          style={{ fontWeight: 700, fontSize: "24px", margin: "0 0 8px", color: "var(--ink)" }}
        >
          That page doesn't exist
        </h1>
        <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "24px", lineHeight: 1.6 }}>
          The link might be broken or the page may have moved. Here's what's actually available:
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            to="/"
            style={{
              textDecoration: "none",
              background: "var(--blue)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            See all tools
          </Link>
          <Link
            to="/resume-tailor"
            style={{
              textDecoration: "none",
              background: "var(--white)",
              border: "1.5px solid var(--line)",
              color: "var(--graphite)",
              padding: "10px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Resume Tailor
          </Link>
          <Link
            to="/contract-checker"
            style={{
              textDecoration: "none",
              background: "var(--white)",
              border: "1.5px solid var(--line)",
              color: "var(--graphite)",
              padding: "10px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Contract Checker
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
