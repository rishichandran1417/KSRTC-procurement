type Tone = "healthy" | "warning" | "critical" | "neutral" | "info" | "submitted";

const STATUS_STYLES: Record<Tone, string> = {
  submitted: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  healthy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  neutral: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
};

export function toneForStatus(status: string): Tone {
  const s = status.toLowerCase();
  if (s === "submitted" || s === "ordered") return "submitted";
  if (["healthy", "received", "closed", "connected", "low"].includes(s)) return "healthy";
  if (["warning", "medium", "partially received"].includes(s)) return "warning";
  if (["critical", "high", "cancelled"].includes(s)) return "critical";
  return "neutral";
}

export function StatusBadge({ label, tone }: { label: string; tone?: Tone }) {
  const resolved = tone ?? toneForStatus(label);
  const style = STATUS_STYLES[resolved] || STATUS_STYLES.neutral;

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-normal border ${style}`}>
      {label}
    </span>
  );
}
