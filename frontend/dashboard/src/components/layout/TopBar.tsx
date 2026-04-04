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
      <div className="max-w-3xl">
        <p className="mb-2 text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">
          Evolving Protocol
        </p>
        <h1 className="m-0 font-[Space_Grotesk] text-2xl font-bold leading-tight tracking-[-0.04em] text-white sm:text-[2rem]">
          {title}
        </h1>
        <p className="mt-2 text-sm font-medium leading-relaxed tracking-[0.02em] text-slate-300/85 sm:text-[0.95rem]">
          {subtitle}
        </p>
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
