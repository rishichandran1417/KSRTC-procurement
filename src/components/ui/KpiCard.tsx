import type { LucideIcon } from "lucide-react";

type Accent = "forecast" | "optimize" | "healthy" | "warning" | "critical" | "neutral";

const ACCENT_BAR: Record<Accent, string> = {
  forecast: "bg-blue-600",
  optimize: "bg-purple-600",
  healthy: "bg-emerald-600",
  warning: "bg-amber-500",
  critical: "bg-rose-600",
  neutral: "bg-[--color-border-strong]",
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
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-md border border-[--color-border] bg-[--color-surface-0] p-3.5 sm:p-4 shadow-2xs transition-all ${
        onClick
          ? "cursor-pointer hover:border-blue-500/60 hover:bg-[--color-surface-1]/50 active:scale-[0.99]"
          : ""
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-[2px] ${ACCENT_BAR[accent]}`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[--color-ink-500] truncate">
          {label}
        </p>
        {Icon ? <Icon size={15} className="text-[--color-ink-400] shrink-0" /> : null}
      </div>
      <p className="tabular mt-2 text-xl sm:text-2xl font-bold text-[--color-ink-900] tracking-tight">
        {value}
        {unit ? (
          <span className="ml-1 text-xs font-normal text-[--color-ink-500]">{unit}</span>
        ) : null}
      </p>
      {helpText ? (
        <p className="mt-1 text-[11px] text-[--color-ink-500] truncate">{helpText}</p>
      ) : null}
    </div>
  );
}
