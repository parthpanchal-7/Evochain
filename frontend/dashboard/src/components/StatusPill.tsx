interface StatusPillProps {
  label: string;
  tone?: "ok" | "warn" | "neutral";
}

export function StatusPill({ label, tone = "neutral" }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{label}</span>;
}

