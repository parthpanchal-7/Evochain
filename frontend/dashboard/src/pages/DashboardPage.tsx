import {
  Blocks,
  BrainCircuit,
  DatabaseZap,
  Flame,
  Gauge,
  Radar,
  Settings2,
  ShieldAlert,
  Timer,
  Zap
} from "lucide-react";
import { useState } from "react";

import { fetchDashboardSummary, triggerCongestion } from "../api/client";
import { TelemetryChart } from "../components/charts/TelemetryChart";
import { MetricTile } from "../components/common/MetricTile";
import { SectionCard } from "../components/common/SectionCard";
import { AppFrame } from "../components/layout/AppFrame";
import { ProcessFlow, type ProcessStep } from "../components/process/ProcessFlow";
import { usePollingResource } from "../hooks/usePollingResource";
import type { DashboardSummary } from "../types/contracts";

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

export function DashboardPage() {
  const { data, error, loading } = usePollingResource(
    fetchDashboardSummary,
    emptySummary,
    7000
  );
  const overview = data.overview;
  const processSteps = buildProcessSteps(data);
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTriggerCongestion = async () => {
    setIsTriggering(true);
    try {
      await triggerCongestion();
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => setIsTriggering(false), 1500);
  };

  return (
    <AppFrame
      title="Dashboard"
      subtitle="Live blockchain control room with adaptive parameter tuning"
      mode={overview.mode}
    >
      {error ? <div className="banner banner--warn">{error}</div> : null}
      {loading ? <div className="banner">Loading live platform metrics...</div> : null}

      <section className="metric-grid">
  {/* Reusable wrapper classes for the Bulge + Neon effect */}
  {[
    { icon: <Blocks size={18} />, label: "Latest Height", value: `#${overview.chain_height}`, hint: truncateHash(overview.latest_block_hash) },
    { icon: <Timer size={18} />, label: "Block Time", value: `${Math.round(overview.avg_block_time_ms)} ms`, hint: "Adaptive latency target from the safety layer" },
    { icon: <Flame size={18} />, label: "Gas Price", value: `${overview.current_gas_price}`, hint: `Current optimizer confidence ${Math.round(overview.optimizer_confidence * 100)}%` },
    { icon: <Gauge size={18} />, label: "Throughput", value: `${overview.throughput_tps.toFixed(1)} TPS`, hint: `Network load ${Math.round(overview.network_load * 100)}%` }
  ].map((item, index) => (
    <div 
      key={index}
      className="
        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        border border-transparent rounded-xl
        hover:scale-103 hover:-translate-y-1
        hover:border-cyan-400
        hover:shadow-[0_0_25px_rgba(6,182,212,0.6),_0_0_50px_rgba(6,182,212,0.3)]
        hover:z-50
      "
    >
      <MetricTile
        icon={item.icon}
        label={item.label}
        value={item.value}
        hint={item.hint}
      />
    </div>
  ))}
</section>
    <div className="transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:z-50 rounded-xl border border-transparent hover:border-cyan-500/50">
      <SectionCard
        title="Adaptive Loop"
        subtitle="The live path from block telemetry to AI decision, guardrails, persistence, and frontend updates"
      >
        <ProcessFlow steps={processSteps} />
      </SectionCard>
    </div>
      <section className="content-grid">
        <div className="transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-103 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:z-50 rounded-xl border border-transparent hover:border-cyan-400">
        <SectionCard
          title="Live Congestion (Demo)"
          subtitle="Real-time map of mempool pressure and total network load"
          actions={
            <button
              onClick={handleTriggerCongestion}
              disabled={isTriggering}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm tracking-wide
                transition-all duration-300 transform outline-none
                ${isTriggering 
                  ? 'bg-red-900/50 text-red-300 border border-red-700/50 cursor-not-allowed hidden' 
                  : 'bg-red-600 hover:bg-red-500 text-white border border-red-500 hover:scale-105 hover:shadow-[0_0_20px_rgba(239,68,68,0.8)] shadow-[0_0_10px_rgba(239,68,68,0.5)] cursor-pointer'
                }
              `}
            >
              <Zap size={16} className={isTriggering ? 'animate-pulse' : 'animate-bounce'} />
              {isTriggering ? 'SPIKING NETWORK...' : 'TRIGGER CONGESTION'}
            </button>
          }
        >
          <TelemetryChart
            data={data.telemetry_history}
            primaryKey="mempool_size"
            secondaryKey="network_load"
          />
        </SectionCard>
        </div>
        <div className="transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:z-50 rounded-xl border border-transparent hover:border-cyan-400">
        <SectionCard
          title="AI Decision"
          subtitle="Most recent safe recommendation returned by the control plane"
        >
          {data.latest_optimization ? (
            <div className="decision-stack">
              <div className="decision-row">
                <span>Block Size</span>
                <strong>{data.latest_optimization.decision.block_size}</strong>
              </div>
              <div className="decision-row">
                <span>Gas Price</span>
                <strong>{data.latest_optimization.decision.gas_price}</strong>
              </div>
              <div className="decision-row">
                <span>Policy</span>
                <strong>{data.latest_optimization.decision.policy ?? "rl-q-learning"}</strong>
              </div>
              <div className="decision-row">
                <span>Trend</span>
                <strong>{data.latest_optimization.forecast.trend}</strong>
              </div>
              <ul className="signal-list">
                {data.latest_optimization.decision.rationale.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="empty-state">Waiting for the first optimization cycle.</div>
          )}
        </SectionCard>
        </div>
      </section>
      
      <section className="content-grid">
        <div className="transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:z-50 rounded-xl border border-transparent hover:border-cyan-400">
        <SectionCard
          title="Recent Blocks"
          subtitle="Blocks indexed through the ingest pipeline"
        >
          <div className="table-list">
            {data.recent_blocks.length ? (
              data.recent_blocks.map((block) => (
                <div key={block.hash} className="table-row">
                  <div>
                    <strong>#{block.index}</strong>
                    <span>{truncateHash(block.hash)}</span>
                  </div>
                  <span>{block.transaction_count} tx</span>
                </div>
              ))
            ) : (
              <div className="empty-state">No indexed blocks yet.</div>
            )}
          </div>
        </SectionCard>
        </div>
      <div className="transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:z-50 rounded-xl border border-transparent hover:border-cyan-400">
        <SectionCard
          title="Security Pulse"
          subtitle="Alerts generated from ingest telemetry"
          actions={
            <div className="status-badge">
              <ShieldAlert size={14} />
              <span>{data.alerts.length} active</span>
            </div>
          }
        >
          <div className="alert-list">
            {data.alerts.length ? (
              data.alerts.map((alert) => (
                <div key={alert.id} className={`alert-card alert-card--${alert.level}`}>
                  <div>
                    <strong>{alert.kind}</strong>
                    <p>{alert.message}</p>
                  </div>
                  <span>{new Date(alert.created_at).toLocaleTimeString()}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">No alerts triggered in the latest cycle.</div>
            )}
          </div>
        </SectionCard>
        </div>
      </section>
    </AppFrame>
  );
}

function truncateHash(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function buildProcessSteps(summary: DashboardSummary): ProcessStep[] {
  const optimization = summary.latest_optimization;
  const overview = summary.overview;
  const hasOptimization = Boolean(optimization);
  const hasIndexedBlock = summary.recent_blocks.length > 0;

  return [
    {
      id: "telemetry",
      title: "Sense Telemetry",
      description:
        "The Rust miner captures mempool pressure, gas price, block latency, throughput, peer count, and chain height.",
      meta: `mempool ${overview.pending_transactions} | peers ${overview.peer_count}`,
      status: hasIndexedBlock || hasOptimization ? "active" : "ready",
      icon: <Radar size={18} />
    },
    {
      id: "forecast",
      title: "Forecast Load",
      description:
        "ARIMA estimates the next mempool state and near-term network load from recent telemetry history.",
      meta: optimization
        ? `${optimization.forecast.model ?? "hybrid-arima"} | ${optimization.forecast.trend}`
        : "waiting for /optimize",
      status: hasOptimization ? "active" : "waiting",
      icon: <BrainCircuit size={18} />
    },
    {
      id: "policy",
      title: "Select RL Action",
      description:
        "The controller chooses the next block size and gas move from the current state bucket.",
      meta: optimization
        ? `${optimization.decision.policy ?? "rl-q-learning"} | ${Math.round(
            optimization.decision.confidence * 100
          )}% confidence`
        : "policy idle",
      status: hasOptimization ? "active" : "waiting",
      icon: <Settings2 size={18} />
    },
    {
      id: "guard",
      title: "Clamp Unsafe Output",
      description:
        "Simulation guardrails reject or adjust unstable parameter changes before they hit the next block.",
      meta: optimization ? optimization.simulation_status : "no safety verdict yet",
      status: hasOptimization ? "active" : "waiting",
      icon: <ShieldAlert size={18} />
    },
    {
      id: "ingest",
      title: "Persist Node State",
      description:
        "The mined block, its transactions, telemetry snapshot, and optimization record are ingested by the API.",
      meta: `${summary.recent_blocks.length} blocks | ${summary.recent_transactions.length} tx`,
      status: hasIndexedBlock ? "active" : "ready",
      icon: <Blocks size={18} />
    },
    {
      id: "surface",
      title: "Render Platform Views",
      description:
        "Dashboard, explorer, governance, and security screens read the same indexed backend state.",
      meta: `${overview.mode} | ${summary.alerts.length} alerts`,
      status: hasIndexedBlock ? "active" : "ready",
      icon: <DatabaseZap size={18} />
    }
  ];
}