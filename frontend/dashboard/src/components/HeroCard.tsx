import type { HealthResponse } from "../types/contracts";
import { StatusPill } from "./StatusPill";

interface HeroCardProps {
  nodeId: string;
  health: HealthResponse | null;
}

export function HeroCard({ nodeId, health }: HeroCardProps) {
  const tone = health?.status === "ok" ? "ok" : health?.status === "offline" ? "warn" : "neutral";

  return (
    <section className="hero-card">
      <div>
        <p className="eyebrow">Adaptive blockchain control room</p>
        <h1>EvoChain AI Dashboard</h1>
        <p className="hero-copy">
          This view packages the system story for demos: live telemetry in, AI recommendation out,
          safer next-block configuration ready to apply.
        </p>
      </div>

      <div className="hero-meta">
        <StatusPill label={health ? `${health.service} ${health.version}` : "Connecting"} tone={tone} />
        <p className="hero-node">Active node: {nodeId}</p>
      </div>
    </section>
  );
}

