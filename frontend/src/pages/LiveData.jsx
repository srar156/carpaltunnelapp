import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const POLL_MS    = 1000;
const THRESHOLD  = 0.2;
const MAX_CHART  = 120; // points visible in the chart window

function DiffDisplay({ diff }) {
  if (diff === null || diff === undefined) {
    return (
      <div className="rounded-xl bg-gray-800 border border-gray-700 p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
          Current Difference
        </p>
        <p className="text-4xl font-bold text-gray-500">—</p>
      </div>
    );
  }

  const above = Math.abs(diff) > THRESHOLD;

  return (
    <div
      className={`rounded-xl border p-6 text-center transition-colors ${
        above
          ? "bg-red-950 border-red-700"
          : "bg-green-950 border-green-800"
      }`}
    >
      <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
        Current Difference
      </p>
      <p
        className={`text-5xl font-bold tabular-nums ${
          above ? "text-red-400" : "text-green-400"
        }`}
      >
        {diff.toFixed(4)}
      </p>
      <p
        className={`text-sm font-medium mt-2 ${
          above ? "text-red-500" : "text-green-500"
        }`}
      >
        {above ? "⚠ Above threshold" : "✓ Within threshold"}
      </p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 font-mono mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: p.color }}
          />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color }}>
            {Number(p.value).toFixed(4)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LiveData() {
  const [allReadings, setAllReadings] = useState([]);
  const [fetchError, setFetchError]   = useState(false);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/data");
      if (!res.ok) throw new Error();
      setAllReadings(await res.json());
      setFetchError(false);
    } catch {
      setFetchError(true);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Slice to most recent MAX_CHART points for the chart
  const chartData = allReadings.slice(-MAX_CHART).map((r) => ({
    label: r.ts.slice(11, 23), // HH:MM:SS.mmm
    d1:    r.d1,
    d2:    r.d2,
    diff:  r.diff,
  }));

  const latest     = allReadings.at(-1) ?? null;
  const latestDiff = latest?.diff ?? null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Live Sensor Feed</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Polling every second · showing last {MAX_CHART} readings
          </p>
        </div>
        <span className="text-sm text-gray-400">
          <span className="font-semibold text-white">
            {allReadings.length}
          </span>{" "}
          buffered
        </span>
      </div>

      {fetchError && (
        <div className="bg-red-950 border border-red-700 rounded-xl px-4 py-3 text-red-400 text-sm">
          Cannot reach the backend. Is Flask running on port 5000?
        </div>
      )}

      {/* Diff prominently shown */}
      <DiffDisplay diff={latestDiff} />

      {/* Latest axis values */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Device 1  Z", value: latest?.d1, color: "text-indigo-400" },
          { label: "Device 2  Z", value: latest?.d2, color: "text-cyan-400"   },
          { label: "Difference",  value: latest?.diff, color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>
              {value != null ? value.toFixed(4) : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">
          Device 1 &amp; Device 2 — Z-value over time
        </h2>

        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
            Waiting for serial data…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 8, left: -10, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "#6b7280" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#6b7280" }}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                formatter={(v) =>
                  v === "d1" ? "Device 1" : v === "d2" ? "Device 2" : v
                }
              />
              <ReferenceLine
                y={THRESHOLD}
                stroke="#f59e0b"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{
                  value: `threshold ${THRESHOLD}`,
                  position: "insideTopRight",
                  fontSize: 9,
                  fill: "#f59e0b",
                }}
              />
              <Line
                type="monotone"
                dataKey="d1"
                name="d1"
                stroke="#818cf8"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="d2"
                name="d2"
                stroke="#22d3ee"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
