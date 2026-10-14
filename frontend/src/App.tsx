import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import AppShell from "./components/AppShell";
import Landing from "./pages/Landing";
import Connect from "./pages/Connect";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
        </Route>
        <Route element={<AppShell />}>
          <Route path="/connect" element={<Connect />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}