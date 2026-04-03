import type { ReactNode } from "react";

interface MetricTileProps {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}

export function MetricTile({ icon, label, value, hint }: MetricTileProps) {
  return (
    <article className="metric-tile">
      <div className="metric-icon">{icon}</div>
      <p className="metric-label">{label}</p>
      <strong className="metric-value">{value}</strong>
      <p className="metric-hint">{hint}</p>
    </article>
  );
}
