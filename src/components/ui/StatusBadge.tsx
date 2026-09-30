export type Tone = "healthy" | "warning" | "critical" | "neutral" | "info" | "submitted";

interface StatusConfig {
  dotClass: string;
  badgeClass: string;
  textClass: string;
}

const STATUS_CONFIGS: Record<Tone, StatusConfig> = {
  submitted: {
    dotClass: "bg-blue-600 dark:bg-blue-400",
    badgeClass: "border-blue-200/90 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/40",
    textClass: "text-blue-900 dark:text-blue-200",
  },
  healthy: {
    dotClass: "bg-emerald-600 dark:bg-emerald-400",
    badgeClass: "border-emerald-200/90 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40",
    textClass: "text-emerald-900 dark:text-emerald-200",
  },
  warning: {
    dotClass: "bg-amber-500 dark:bg-amber-400",
    badgeClass: "border-amber-200/90 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40",
    textClass: "text-amber-900 dark:text-amber-200",
  },
  critical: {
    dotClass: "bg-rose-600 dark:bg-rose-400",
    badgeClass: "border-rose-200/90 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/40",
    textClass: "text-rose-900 dark:text-rose-200",
  },
  neutral: {
    dotClass: "bg-slate-400 dark:bg-zinc-500",
    badgeClass: "border-slate-200/90 bg-slate-50/80 dark:border-zinc-800 dark:bg-zinc-800/60",
    textClass: "text-slate-800 dark:text-zinc-200",
  },
  info: {
    dotClass: "bg-sky-600 dark:bg-sky-400",
    badgeClass: "border-sky-200/90 bg-sky-50/80 dark:border-sky-900/60 dark:bg-sky-950/40",
    textClass: "text-sky-900 dark:text-sky-200",
  },
};

export function toneForStatus(status: string): Tone {
  const s = status.toLowerCase();
  if (s === "submitted" || s === "ordered") return "submitted";
  if (["healthy", "received", "closed", "connected", "low", "approved"].includes(s)) return "healthy";
  if (["warning", "medium", "partially received", "delayed"].includes(s)) return "warning";
  if (["critical", "high", "cancelled"].includes(s)) return "critical";
  return "neutral";
}

export function StatusBadge({
  label,
  tone,
  className = "",
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  const resolved = tone ?? toneForStatus(label);
  const cfg = STATUS_CONFIGS[resolved] || STATUS_CONFIGS.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${cfg.badgeClass} ${cfg.textClass} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dotClass}`} />
      <span className="truncate">{label}</span>
    </span>
  );
}
