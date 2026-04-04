import { AlertTriangle, Shield, ShieldCheck, Siren } from "lucide-react";

import { fetchDashboardSummary, fetchSecurityAlerts } from "../api/client";
import { TelemetryChart } from "../components/charts/TelemetryChart";
import { MetricTile } from "../components/common/MetricTile";
import { SectionCard } from "../components/common/SectionCard";
import { AppFrame } from "../components/layout/AppFrame";
import { usePollingResource } from "../hooks/usePollingResource";
import type { DashboardSummary, SecurityAlert } from "../types/contracts";

const emptySummary: DashboardSummary = {
  overview: {
    chain_height: 0,
    latest_block_hash: "GENESIS",
    pending_transactions: 0,
    current_gas_price: 0,
    block_size: 1,
    avg_block_time_ms: 0,
    throughput_tps: 0,
    peer_count: 0,
    network_load: 0,
    latest_forecast_trend: "stable",
    optimizer_confidence: 0,
    last_updated: new Date().toISOString(),
    mode: "memory"
  },
  recent_blocks: [],
  recent_transactions: [],
  telemetry_history: [],
  latest_optimization: null,
  alerts: []
};

export function SecurityPage() {
  const { data: summary } = usePollingResource(fetchDashboardSummary, emptySummary, 7000);
  const { data: alerts } = usePollingResource<SecurityAlert[]>(
    () => fetchSecurityAlerts(12),
    [],
    7000
  );

  const warningCount = alerts.filter((alert) => alert.level === "warning").length;
  const criticalCount = alerts.filter((alert) => alert.level === "critical").length;

  return (
    <AppFrame
      title="Security"
      subtitle="Alert detection, throughput anomalies, and node resilience signals"
      mode={summary.overview.mode}
    >
<section className="metric-grid">
  {[
    {
      icon: <ShieldCheck size={18} />,
      label: "Security Status",
      value: criticalCount ? "At Risk" : "Stable",
      hint: "Derived from ingest-time alert generation",
      isCritical: criticalCount > 0 // Flag for red glow
    },
    {
      icon: <AlertTriangle size={18} />,
      label: "Warnings",
      value: warningCount.toString(),
      hint: "Congestion, gas spikes, and peer fragility",
      isWarning: warningCount > 0 // Optional: could make this Amber/Orange
    },
    {
      icon: <Siren size={18} />,
      label: "Critical Alerts",
      value: criticalCount.toString(),
      hint: "Throughput collapse or severe instability",
      isCritical: criticalCount > 0 // Flag for red glow
    },
    {
      icon: <Shield size={18} />,
      label: "Peer Resilience",
      value: `${summary.overview.peer_count}`,
      hint: "Latest observed connected peers"
    }
  ].map((tile, idx) => (
    <div 
      key={idx}
      className={`
        /* Transition & Bulge */
        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        hover:scale-103 hover:-translate-y-1 hover:z-50
        border border-transparent rounded-xl cursor-pointer
        
        /* Dynamic Neon Styling */
        ${tile.isCritical 
          ? 'hover:border-red-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.7),_0_0_50px_rgba(239,68,68,0.4)]' 
          : 'hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.5),_0_0_40px_rgba(6,182,212,0.2)]'
        }
      `}
    >
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
        <SectionCard
          title="Threat Surface"
          subtitle="Network load trend used to detect defensive thresholds"
        >
          <TelemetryChart
            data={summary.telemetry_history}
            variant="area"
            primaryKey="network_load"
          />
        </SectionCard>

        <SectionCard
          title="Security Alerts"
          subtitle="Most recent alert records persisted by the platform"
        >
          <div className="alert-list">
            {alerts.length ? (
              alerts.map((alert) => (
                <div key={alert.id} className={`alert-card alert-card--${alert.level}`}>
                  <div>
                    <strong>{alert.kind}</strong>
                    <p>{alert.message}</p>
                  </div>
                  <span>{new Date(alert.created_at).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">No alerts have been raised yet.</div>
            )}
          </div>
        </SectionCard>
      </section>
    </AppFrame>
  );
}