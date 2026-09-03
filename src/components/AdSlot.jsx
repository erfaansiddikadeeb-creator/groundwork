// Placeholder ad slot. Once your AdSense account is approved, replace the
// contents of this div with your <ins class="adsbygoogle"> unit code (and
// load the AdSense script once in index.html — see README).
export default function AdSlot({ label = "Advertisement", height = 90 }) {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "10px 32px" }}>
      <div
        className="font-mono"
        style={{
          height: `${height}px`,
          border: "1px dashed var(--line)",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#A8A8A5",
          fontSize: "10.5px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          background: "var(--white)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
