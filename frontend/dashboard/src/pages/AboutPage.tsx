import {
  Blocks,
  Boxes,
  Brain,
  BrainCircuit,
  Database,
  DatabaseZap,
  Radar,
  Settings2,
  ShieldCheck
} from "lucide-react";

import { fetchHealth } from "../api/client";
import { MetricTile } from "../components/common/MetricTile";
import { SectionCard } from "../components/common/SectionCard";
import { AppFrame } from "../components/layout/AppFrame";
import { ProcessFlow, type ProcessStep } from "../components/process/ProcessFlow";
import { usePollingResource } from "../hooks/usePollingResource";
import type { HealthResponse } from "../types/contracts";

const fallbackHealth: HealthResponse = {
  status: "offline",
  service: "EvoChain AI Service",
  version: "0.0.0",
  mode: "memory",
  dependencies: {}
};

export function AboutPage() {
  const { data: health } = usePollingResource(fetchHealth, fallbackHealth, 15000);
  const processSteps: ProcessStep[] = [
    {
      id: "telemetry",
      title: "Collect Telemetry",
      description:
        "Rust nodes observe mempool size, gas, block latency, peers, and throughput after block production.",
      meta: "source: miner and validators",
      status: "active",
      icon: <Radar size={18} />
    },
    {
      id: "forecast",
      title: "Forecast with ARIMA",
      description:
        "The control plane predicts short-horizon mempool movement and network pressure.",
      meta: "model: hybrid-arima",
      status: "active",
      icon: <BrainCircuit size={18} />
    },
    {
      id: "policy",
      title: "Select RL Action",
      description:
        "Online Q-learning chooses the next block size and gas move from the current network state.",
      meta: "policy: rl-q-learning",
      status: "active",
      icon: <Settings2 size={18} />
    },
    {
      id: "guard",
      title: "Clamp Unsafe Output",
      description:
        "A safety layer prevents unstable parameter changes before the decision is applied.",
      meta: "guard: simulation layer",
      status: "active",
      icon: <ShieldCheck size={18} />
    },
    {
      id: "ingest",
      title: "Persist Chain State",
      description:
        "Blocks, transactions, telemetry, alerts, and governance records are stored by the backend.",
      meta: "storage: MongoDB + Redis",
      status: "active",
      icon: <Blocks size={18} />
    },
    {
      id: "surface",
      title: "Index and Show",
      description:
        "Elasticsearch powers search while the dashboard renders explorer, security, and governance views.",
      meta: `frontend mode: ${health.mode ?? "memory"}`,
      status: "active",
      icon: <DatabaseZap size={18} />
    }
  ];

  return (
    <AppFrame
      title="About EvoChain"
      subtitle="Architecture, storage topology, and adaptive control flow"
      mode={health.mode}
    >
<section className="metric-grid">
  {[
    {
      icon: <Brain size={18} />,
      label: "AI Service",
      value: health.service,
      hint: `Version ${health.version}`
    },
    {
      icon: <Database size={18} />,
      label: "Storage Mode",
      value: health.mode ?? "memory",
      hint: "MongoDB for source of truth, Redis for hot state, Elasticsearch for search"
    },
    {
      icon: <ShieldCheck size={18} />,
      label: "Health",
      value: health.status,
      hint: "Service status exposed by FastAPI",
      isHealthy: health.status === "healthy" // Optional: logic for green/cyan vs red
    },
    {
      icon: <Boxes size={18} />,
      label: "Dependencies",
      value: Object.keys(health.dependencies ?? {}).length.toString(),
      hint: "Tracked backend integrations"
    }
  ].map((tile, idx) => (
    <div 
      key={idx}
      className="
        /* Subtle Bulge & Lift */
        transition-all duration-300 ease-out
        hover:scale-[1.03] hover:-translate-y-1 hover:z-50
        
        /* Layout & Cursor */
        border border-transparent rounded-xl cursor-pointer
        
        /* Neon Cyan Glow */
        hover:border-cyan-400/50 
        hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]
      "
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
        <SectionCard title="System Architecture" subtitle="What each layer now owns">
          <div className="about-grid">
            <article className="about-card">
              <strong>Rust Node</strong>
              <p>Mines blocks, optimizes parameters, and publishes block plus telemetry events.</p>
            </article>
            <article className="about-card">
              <strong>FastAPI Control Plane</strong>
              <p>Stores platform data, serves explorer APIs, and orchestrates forecasting plus RL decisions.</p>
            </article>
            <article className="about-card">
              <strong>Mongo + Redis + Elasticsearch</strong>
              <p>MongoDB persists records, Redis caches hot summaries and RL values, Elasticsearch powers search.</p>
            </article>
          </div>
        </SectionCard>

        <SectionCard
          title="Adaptive Flow"
          subtitle="How one block becomes the next optimized policy cycle"
        >
          <ProcessFlow steps={processSteps} />
        </SectionCard>
      </section>
    </AppFrame>
  );
}
