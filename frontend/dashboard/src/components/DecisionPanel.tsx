import type { OptimizationResponse } from "../types/contracts";
import { StatusPill } from "./StatusPill";

interface DecisionPanelProps {
  optimization: OptimizationResponse | null;
}

export function DecisionPanel({ optimization }: DecisionPanelProps) {
  if (!optimization) {
    return (
      <section className="panel">
        <div className="panel__header">
          <h2>Optimizer Output</h2>
          <StatusPill label="Waiting for API" tone="warn" />
        </div>
        <p className="panel__empty">
          The dashboard is up, but the AI service is not answering yet. Start FastAPI to see live
          recommendations.
        </p>
      </section>
    );
  }

  const tone = optimization.simulation_status === "accepted" ? "ok" : "warn";

  return (
    <section className="panel panel--decision">
      <div className="panel__header">
        <h2>Optimizer Output</h2>
        <StatusPill label={optimization.simulation_status} tone={tone} />
      </div>

      <div className="decision-grid">
        <div>
          <p className="decision-label">Recommended block size</p>
          <p className="decision-value">{optimization.decision.block_size}</p>
        </div>
        <div>
          <p className="decision-label">Recommended gas price</p>
          <p className="decision-value">{optimization.decision.gas_price}</p>
        </div>
        <div>
          <p className="decision-label">Forecast load</p>
          <p className="decision-value">{Math.round(optimization.forecast.predicted_load * 100)}%</p>
        </div>
        <div>
          <p className="decision-label">Confidence</p>
          <p className="decision-value">{Math.round(optimization.decision.confidence * 100)}%</p>
        </div>
      </div>

      <div className="decision-footnote">
        <p className="decision-label">Rationale</p>
        <ul className="rationale-list">
          {optimization.decision.rationale.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

