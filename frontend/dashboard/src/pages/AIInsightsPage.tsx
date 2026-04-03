import { Brain, Database, Radar, Sparkles } from "lucide-react";

import { fetchAIInsights } from "../api/client";
import { TelemetryChart } from "../components/charts/TelemetryChart";
import { MetricTile } from "../components/common/MetricTile";
import { SectionCard } from "../components/common/SectionCard";
import { AppFrame } from "../components/layout/AppFrame";
import { usePollingResource } from "../hooks/usePollingResource";
import type { AIInsightsResponse } from "../types/contracts";

const emptyInsights: AIInsightsResponse = {
  latest_optimization: null,
  recent_optimizations: [],
  telemetry_history: [],
  model_status: {},
  dependency_status: {}
};

export function AIInsightsPage() {
  const { data, error } = usePollingResource(fetchAIInsights, emptyInsights, 7000);
  const forecastStatus = toRecord(data.model_status.forecast);
  const policyStatus = toRecord(data.model_status.policy);

  return (
    <AppFrame
      title="AI Insights"
      subtitle="Forecast status, reinforcement policy signals, and recent optimization outcomes"
      mode={String(data.dependency_status.redis ?? "memory")}
    >
      {error ? <div className="banner banner--warn">{error}</div> : null}

      <section className="metric-grid">
  {/* Wrap each MetricTile in the 'Bulge + Neon' container */}
  {[
    {
      icon: <Brain size={18} />,
      label: "Forecast Model",
      value: String(forecastStatus.model ?? "offline"),
      hint: `Min points ${String(forecastStatus.min_points ?? "n/a")}`
    },
    {
      icon: <Radar size={18} />,
      label: "RL Policy",
      value: String(policyStatus.policy ?? "offline"),
      hint: `States learned ${String(policyStatus.states ?? 0)}`
    },
    {
      icon: <Sparkles size={18} />,
      label: "Latest Trend",
      value: data.latest_optimization?.forecast.trend ?? "stable",
      hint: `Confidence ${Math.round((data.latest_optimization?.forecast.confidence ?? 0) * 100)}%`
    },
    {
      icon: <Database size={18} />,
      label: "Dependencies",
      value: Object.values(data.dependency_status).filter((v) => v === "connected").length.toString(),
      hint: "Connected platform services"
    }
  ].map((tile, idx) => (
    <div 
      key={idx}
      className="
        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        hover:scale-103 hover:-translate-y-1 hover:z-50
        
        border border-transparent rounded-xl
        hover:border-cyan-400/60
        hover:shadow-[0_0_20px_rgba(6,182,212,0.5),_0_0_40px_rgba(6,182,212,0.2)]
        
        cursor-pointer
      ">
  
      <MetricTile
        icon={tile.icon}
        label={tile.label}
        value={tile.value}
        hint={tile.hint}
      />
    </div>
  ))}
</section>

      <section className="content-grid">
        <div className="transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-103 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:z-50 rounded-xl border border-transparent hover:border-cyan-400">
        <SectionCard
          title="Forecast History"
          subtitle="Recent telemetry used by ARIMA and fallback logic"
        >
          <TelemetryChart
            data={data.telemetry_history}
            variant="area"
            primaryKey="network_load"
          />
        </SectionCard>
        </div>

        <div className="transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-103 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:z-50 rounded-xl border border-transparent hover:border-cyan-400">
        <SectionCard
          title="Dependency Health"
          subtitle="Current backend adapters and cache/search availability"
        >
          <div className="dependency-list">
            {Object.entries(data.dependency_status).map(([name, status]) => (
              <div key={name} className="dependency-row">
                <strong>{name}</strong>
                <span className={status === "connected" ? "pill pill--ok" : "pill pill--warn"}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
        </div>
      </section>

      <div className="transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-103 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:z-50 rounded-xl border border-transparent hover:border-cyan-400">
      <SectionCard
        title="Recent Optimizations"
        subtitle="Reward and rationale trail from the online control loop"
      >
        <div className="optimization-list">
          {data.recent_optimizations.length ? (
            data.recent_optimizations.map((record) => (
              <div key={record.generated_at} className="optimization-card">
                <div className="optimization-card__header">
                  <div>
                    <strong>{record.node_id}</strong>
                    <span>{new Date(record.generated_at).toLocaleString()}</span>
                  </div>
                  <span className="pill pill--neutral">
                    reward {record.reward?.toFixed(2) ?? "n/a"}
                  </span>
                </div>
                <p>
                  Block {record.decision.block_size} | Gas {record.decision.gas_price} | Trend{" "}
                  {record.forecast.trend}
                </p>
                <ul className="signal-list">
                  {record.decision.rationale.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <div className="empty-state">No optimization history has been recorded yet.</div>
          )}
        </div>
      </SectionCard>
      </div>
    </AppFrame>
  );
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
