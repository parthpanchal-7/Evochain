import { Bell, Clock3, Cpu } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle: string;
  mode?: string;
}

export function TopBar({ title, subtitle, mode }: TopBarProps) {
  const timeLabel = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  return (
    <header className="topbar-space-nebula w-full flex items-center justify-between px-6 py-3 relative overflow-hidden">
      <div>
        <p className="eyebrow">Evolving Protocol</p>
        <h1 className="text-white font-bold tracking-tight text-lg leading-none mb-1">{title}</h1>
        <p className="text-cyan-400/70 text-[12px] uppercase tracking-[0.2em] font-medium">{subtitle}</p>
      </div>

      <div className="topbar-meta">
        <div className="topbar-chip">
          <Cpu size={14} />
          <span>{mode ?? "memory"}</span>
        </div>
        <div className="topbar-chip">
          <Clock3 size={14} />
          <span>{timeLabel}</span>
        </div>
        <div className="topbar-chip">
          <Bell size={14} />
          <span>Live</span>
        </div>
        <div className="topbar-neon-line" />
      </div>
    </header>
  );
}
