import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import LiveData from "./pages/LiveData.jsx";
import Report from "./pages/Report.jsx";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <Routes>
          <Route path="/" element={<Navigate to="/live" replace />} />
          <Route path="/live" element={<LiveData />} />
          <Route path="/report" element={<Report />} />
        </Routes>
      </main>
    </div>
  );
}
