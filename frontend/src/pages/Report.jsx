import { useState, useEffect } from "react";

function StatCard({ label, value, sub, highlight }) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight
          ? "bg-red-950 border-red-800"
          : "bg-gray-900 border-gray-800"
      }`}
    >
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
        {label}
      </p>
      <p
        className={`text-3xl font-bold tabular-nums ${
          highlight ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1.5">{sub}</p>}
    </div>
  );
}

function computeStats(readings) {
  if (!readings.length) return null;

  const diffs = readings.map((r) => r.diff);
  const avg   = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const max   = Math.max(...diffs.map(Math.abs));
  const above = diffs.filter((d) => Math.abs(d) > 0.2).length;
  const pct   = (above / diffs.length) * 100;

  return {
    total: readings.length,
    avg:   avg.toFixed(4),
    max:   max.toFixed(4),
    above,
    pct:   pct.toFixed(1),
  };
}

export default function Report() {
  const [readings, setReadings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/data");
        if (!res.ok) throw new Error("Server error");
        setReadings(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60 text-gray-500 text-sm">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950 border border-red-700 rounded-xl p-6 text-red-400 text-sm">
        Failed to load data: {error}. Is Flask running?
      </div>
    );
  }

  const stats = computeStats(readings);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Session Report</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Summary of the current in-memory buffer (up to 500 readings)
        </p>
      </div>

      {!stats ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500 text-sm">
          No data yet. Connect the Arduino and wait for readings to come in.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total Readings"
              value={stats.total.toLocaleString()}
              sub="in current buffer"
            />
            <StatCard
              label="Avg Difference"
              value={stats.avg}
              sub="mean |D1 − D2|"
            />
            <StatCard
              label="Max Difference"
              value={stats.max}
              sub="peak absolute value"
              highlight={parseFloat(stats.max) > 0.2}
            />
            <StatCard
              label="Above Threshold"
              value={`${stats.pct}%`}
              sub={`${stats.above} of ${stats.total} readings > 0.2`}
              highlight={parseFloat(stats.pct) > 20}
            />
          </div>

          {/* Risk assessment banner */}
          <div
            className={`rounded-xl border p-5 flex items-center gap-4 ${
              parseFloat(stats.pct) > 20
                ? "bg-red-950 border-red-800"
                : "bg-green-950 border-green-900"
            }`}
          >
            <span className="text-3xl select-none">
              {parseFloat(stats.pct) > 20 ? "⚠️" : "✅"}
            </span>
            <div>
              <p
                className={`font-semibold ${
                  parseFloat(stats.pct) > 20
                    ? "text-red-300"
                    : "text-green-300"
                }`}
              >
                {parseFloat(stats.pct) > 20
                  ? "Elevated carpal tunnel risk detected"
                  : "Motion within normal range"}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {parseFloat(stats.pct) > 20
                  ? `${stats.pct}% of readings exceeded the 0.2 difference threshold. Consider taking breaks or adjusting wrist position.`
                  : `Only ${stats.pct}% of readings exceeded the threshold. Keep it up!`}
              </p>
            </div>
          </div>

          {/* Threshold note */}
          <p className="text-xs text-gray-600 text-right">
            Threshold: |difference| &gt; 0.2 · Buffer cap: 500 readings
          </p>
        </>
      )}
    </div>
  );
}
