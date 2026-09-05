import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import ResumeTailor from "./pages/ResumeTailor.jsx";
import ContractChecker from "./pages/ContractChecker.jsx";
import GrowthTracker from "./pages/GrowthTracker.jsx";
import SalaryVsContract from "./pages/SalaryVsContract.jsx";
import RateCalculator from "./pages/RateCalculator.jsx";
import QuarterlyTax from "./pages/QuarterlyTax.jsx";
import Privacy from "./pages/Privacy.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/resume-tailor" element={<ResumeTailor />} />
      <Route path="/contract-checker" element={<ContractChecker />} />
      <Route path="/growth-tracker" element={<GrowthTracker />} />
      <Route path="/salary-vs-contract" element={<SalaryVsContract />} />
      <Route path="/rate-calculator" element={<RateCalculator />} />
      <Route path="/quarterly-tax" element={<QuarterlyTax />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
