import { useId } from "react";

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

const PRIMARY_NEON = "#42f5ff";
const PRIMARY_NEON_SOFT = "#a6ffff";
const SECONDARY_NEON = "#702dff";
const SECONDARY_NEON_SOFT = "#8069ff";

const axisProps = {
  stroke: "#8aa0c8",
  tickLine: false,
  axisLine: false
} as const;

const tooltipProps = {
  contentStyle: {
    background: "rgba(3, 11, 28, 0.94)",
    border: "1px solid rgba(66, 245, 255, 0.35)",
    borderRadius: "14px",
    boxShadow: "0 0 28px rgba(66, 245, 255, 0.18)"
  },
  cursor: {
    stroke: "rgba(66, 245, 255, 0.22)",
    strokeWidth: 1,
    strokeDasharray: "4 4"
  },
  labelStyle: {
    color: "#edf4ff"
  },
  itemStyle: {
    color: "#d9faff"
  }
} as const;

export function TelemetryChart({
  data,
  variant = "line",
  primaryKey,
  secondaryKey
}: TelemetryChartProps) {
  const chartId = useId().replace(/:/g, "");
  const normalized = data.map((point) => ({
    ...point,
    stamp: new Date(point.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
  }));

  const areaGradientId = `${chartId}-telemetry-area`;
  const primaryStrokeId = `${chartId}-telemetry-primary-stroke`;
  const secondaryStrokeId = `${chartId}-telemetry-secondary-stroke`;
  const primaryGlowId = `${chartId}-telemetry-primary-glow`;
  const secondaryGlowId = `${chartId}-telemetry-secondary-glow`;

  if (!normalized.length) {
    return <div className="empty-state">Waiting for telemetry samples.</div>;
  }

  if (variant === "area") {
    return (
      <div className="chart-shell">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={normalized}>
            <defs>
              <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PRIMARY_NEON} stopOpacity={0.62} />
                <stop offset="55%" stopColor={PRIMARY_NEON_SOFT} stopOpacity={0.22} />
                <stop offset="95%" stopColor={PRIMARY_NEON} stopOpacity={0} />
              </linearGradient>
              <filter id={primaryGlowId} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.5" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id={primaryStrokeId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={PRIMARY_NEON} />
                <stop offset="50%" stopColor={PRIMARY_NEON_SOFT} />
                <stop offset="100%" stopColor="#62d8ff" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="stamp" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipProps} />
            <Area
              type="monotone"
              dataKey={primaryKey}
              stroke={`url(#${primaryStrokeId})`}
              fill={`url(#${areaGradientId})`}
              strokeWidth={2.5}
              filter={`url(#${primaryGlowId})`}
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
          <defs>
            <filter id={primaryGlowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id={secondaryGlowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={primaryStrokeId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={PRIMARY_NEON} />
              <stop offset="50%" stopColor={PRIMARY_NEON_SOFT} />
              <stop offset="100%" stopColor="#62d8ff" />
            </linearGradient>
            <linearGradient id={secondaryStrokeId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={SECONDARY_NEON} />
              <stop offset="50%" stopColor={SECONDARY_NEON_SOFT} />
              <stop offset="100%" stopColor="#ff6b9a" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="stamp" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipProps} />
          <Line
            type="monotone"
            dataKey={primaryKey}
            stroke={PRIMARY_NEON}
            strokeWidth={10}
            strokeOpacity={0.14}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            type="monotone"
            dataKey={primaryKey}
            stroke={`url(#${primaryStrokeId})`}
            strokeWidth={3}
            dot={{
              r: 4.5,
              fill: PRIMARY_NEON_SOFT,
              stroke: PRIMARY_NEON,
              strokeWidth: 1.6,
              filter: `url(#${primaryGlowId})`
            }}
            activeDot={{
              r: 6,
              fill: PRIMARY_NEON_SOFT,
              stroke: "#f4ffff",
              strokeWidth: 1.8,
              filter: `url(#${primaryGlowId})`
            }}
            filter={`url(#${primaryGlowId})`}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {secondaryKey ? (
            <>
              <Line
                type="monotone"
                dataKey={secondaryKey}
                stroke={SECONDARY_NEON}
                strokeWidth={8}
                strokeOpacity={0.12}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Line
                type="monotone"
                dataKey={secondaryKey}
                stroke={`url(#${secondaryStrokeId})`}
                strokeWidth={2.4}
                dot={{
                  r: 4,
                  fill: SECONDARY_NEON_SOFT,
                  stroke: SECONDARY_NEON,
                  strokeWidth: 1.4,
                  filter: `url(#${secondaryGlowId})`
                }}
                activeDot={{
                  r: 5.4,
                  fill: SECONDARY_NEON_SOFT,
                  stroke: "#fff0d6",
                  strokeWidth: 1.6,
                  filter: `url(#${secondaryGlowId})`
                }}
                filter={`url(#${secondaryGlowId})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
