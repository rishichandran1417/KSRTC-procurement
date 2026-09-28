type Tone = "healthy" | "warning" | "critical" | "neutral" | "info" | "submitted" | "approved";

const STATUS_STYLES: Record<Tone, { badge: string; dot: string }> = {
  submitted: {
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
    dot: "bg-blue-500",
  },
  approved: {
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
    dot: "bg-sky-500",
  },
  healthy: {
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    dot: "bg-emerald-500",
  },
  warning: {
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
    dot: "bg-amber-500",
  },
  critical: {
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
    dot: "bg-rose-500",
  },
  neutral: {
    badge: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25",
    dot: "bg-zinc-400",
  },
  info: {
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
    dot: "bg-blue-500",
  },
};

export function toneForStatus(status: string): Tone {
  const s = status.toLowerCase();
  if (s === "approved") return "approved";
  if (s === "submitted" || s === "ordered") return "submitted";
  if (["healthy", "received", "closed", "connected", "low"].includes(s)) return "healthy";
  if (["warning", "medium", "partially received"].includes(s)) return "warning";
  if (["critical", "high", "cancelled"].includes(s)) return "critical";
  return "neutral";
}

export function StatusBadge({
  label,
  tone,
  showDot = true,
}: {
  label: string;
  tone?: Tone;
  showDot?: boolean;
}) {
  const resolved = tone ?? toneForStatus(label);
  const config = STATUS_STYLES[resolved] || STATUS_STYLES.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium border shrink-0 ${config.badge}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dot}`} />}
      <span>{label}</span>
    </span>
  );
}
