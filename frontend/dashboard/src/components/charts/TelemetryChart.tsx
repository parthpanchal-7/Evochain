import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { TelemetryPoint } from "../../types/contracts";

interface TelemetryChartProps {
  data: TelemetryPoint[];
  variant?: "line" | "area";
  primaryKey: keyof TelemetryPoint;
  secondaryKey?: keyof TelemetryPoint;
}

export function TelemetryChart({
  data,
  variant = "line",
  primaryKey,
  secondaryKey
}: TelemetryChartProps) {
  const normalized = data.map((point) => ({
    ...point,
    stamp: new Date(point.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
  }));

  if (!normalized.length) {
    return <div className="empty-state">Waiting for telemetry samples.</div>;
  }

  if (variant === "area") {
    return (
      <div className="chart-shell">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={normalized}>
            <defs>
              <linearGradient id="telemetryArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#44d7ff" stopOpacity={0.55} />
                <stop offset="95%" stopColor="#44d7ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="stamp" stroke="#8aa0c8" tickLine={false} axisLine={false} />
            <YAxis stroke="#8aa0c8" tickLine={false} axisLine={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey={primaryKey}
              stroke="#44d7ff"
              fill="url(#telemetryArea)"
              strokeWidth={2.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="chart-shell">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={normalized}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="stamp" stroke="#8aa0c8" tickLine={false} axisLine={false} />
          <YAxis stroke="#8aa0c8" tickLine={false} axisLine={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={primaryKey}
            stroke="#44d7ff"
            strokeWidth={2.4}
            dot={false}
          />
          {secondaryKey ? (
            <Line
              type="monotone"
              dataKey={secondaryKey}
              stroke="#ffb454"
              strokeWidth={2.1}
              dot={false}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
