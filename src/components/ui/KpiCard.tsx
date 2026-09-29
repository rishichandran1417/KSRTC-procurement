import type { LucideIcon } from "lucide-react";

type Accent = "forecast" | "optimize" | "healthy" | "warning" | "critical" | "neutral";

const ACCENT_DOT: Record<Accent, string> = {
  forecast: "bg-blue-600",
  optimize: "bg-purple-600",
  healthy: "bg-emerald-600",
  warning: "bg-amber-500",
  critical: "bg-rose-600",
  neutral: "bg-slate-400 dark:bg-zinc-500",
};

export function KpiCard({
  label,
  value,
  unit,
  accent = "neutral",
  icon: Icon,
  helpText,
  onClick,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: Accent;
  icon?: LucideIcon;
  helpText?: string;
  onClick?: () => void;
}) {
  const dot = ACCENT_DOT[accent] || ACCENT_DOT.neutral;

  return (
    <div
      onClick={onClick}
      className={`border-r last:border-r-0 border-slate-200 dark:border-zinc-800 px-4 py-2.5 min-w-0 ${
        onClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50" : ""
      }`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        {accent !== "neutral" && <span className={`h-1.5 w-1.5 rounded-full ${dot} shrink-0`} />}
        <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">
          {label}
        </span>
        {Icon ? <Icon size={11} className="text-slate-400 dark:text-zinc-500 shrink-0 ml-auto" /> : null}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-bold tracking-tight text-slate-900 dark:text-zinc-100 tabular-nums">
          {value}
        </span>
        {unit ? <span className="text-[11px] text-slate-500 dark:text-zinc-400">{unit}</span> : null}
      </div>
      {helpText ? (
        <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate mt-0.5">{helpText}</p>
      ) : null}
    </div>
  );
}
