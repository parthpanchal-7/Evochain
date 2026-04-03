import type { OptimizationResponse, TelemetrySnapshot } from "../types/contracts";

interface TrendPanelProps {
  history: TelemetrySnapshot[];
  optimization: OptimizationResponse | null;
}

export function TrendPanel({ history, optimization }: TrendPanelProps) {
  const maxMempool = Math.max(...history.map((item) => item.mempool_size), 1);

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Telemetry Trend</h2>
        <p className="panel__subtitle">
          {optimization
            ? `Forecast trend: ${optimization.forecast.trend}`
            : "Showing the latest local telemetry samples"}
        </p>
      </div>

      <div className="trend-list">
        {history.map((point, index) => (
          <div className="trend-item" key={`${point.chain_height}-${index}`}>
            <div className="trend-item__meta">
              <span>Block {point.chain_height}</span>
              <span>{point.mempool_size} tx pending</span>
            </div>
            <div className="trend-item__bar">
              <div
                className="trend-item__fill"
                style={{ width: `${(point.mempool_size / maxMempool) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

