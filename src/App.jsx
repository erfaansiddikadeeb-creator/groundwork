import { Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import Home from "./pages/Home.jsx";
import ResumeTailor from "./pages/ResumeTailor.jsx";
import ContractChecker from "./pages/ContractChecker.jsx";
import Privacy from "./pages/Privacy.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/resume-tailor" element={<ResumeTailor />} />
        <Route path="/contract-checker" element={<ContractChecker />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Analytics />
    </>
  );
}
