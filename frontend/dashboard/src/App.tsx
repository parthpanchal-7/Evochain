import { Navigate, Route, Routes } from "react-router-dom";

import { AboutPage } from "./pages/AboutPage";
import { AIInsightsPage } from "./pages/AIInsightsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExplorerPage } from "./pages/ExplorerPage";
import { GovernancePage } from "./pages/GovernancePage";
import { SecurityPage } from "./pages/SecurityPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/ai-insights" element={<AIInsightsPage />} />
      <Route path="/explorer" element={<ExplorerPage />} />
      <Route path="/security" element={<SecurityPage />} />
      <Route path="/governance" element={<GovernancePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
