import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

function SerialBadge() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/status");
        if (res.ok) setStatus(await res.json());
      } catch {
        setStatus(null);
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  if (!status) return null;

  return (
    <span
      className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
        status.connected
          ? "bg-green-900/60 text-green-300"
          : "bg-red-900/60 text-red-300"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status.connected ? "bg-green-400 animate-pulse" : "bg-red-400"
        }`}
      />
      {status.connected ? `${status.port} connected` : "No serial"}
    </span>
  );
}

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    [
      "px-4 py-2 rounded-md text-sm font-medium transition-colors",
      isActive
        ? "bg-indigo-600 text-white"
        : "text-gray-400 hover:text-white hover:bg-gray-800",
    ].join(" ");

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg tracking-tight text-white">
            CarpFighter
          </span>
          <SerialBadge />
        </div>
        <div className="flex items-center gap-1">
          <NavLink to="/live" className={linkClass}>
            Live Data
          </NavLink>
          <NavLink to="/report" className={linkClass}>
            Report
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
