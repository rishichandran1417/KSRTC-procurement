import type { LucideIcon } from "lucide-react";

type Accent = "forecast" | "optimize" | "healthy" | "warning" | "critical" | "neutral";

const ACCENT_BAR: Record<Accent, string> = {
  forecast: "bg-[--color-forecast-500]",
  optimize: "bg-[--color-optimize-500]",
  healthy: "bg-[--color-healthy-500]",
  warning: "bg-[--color-warning-500]",
  critical: "bg-[--color-critical-500]",
  neutral: "bg-[--color-ink-400]",
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
      className={`relative overflow-hidden rounded-md border border-[--color-border] bg-[--color-surface-0] p-4 ${
        onClick ? "cursor-pointer hover:border-[--color-forecast-500]/60 hover:shadow-xs transition-all active:scale-[0.99]" : ""
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-0.5 ${ACCENT_BAR[accent]}`} />
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[--color-ink-500]">{label}</p>
        {Icon ? <Icon size={16} className="text-[--color-ink-400]" /> : null}
      </div>
      <p className="tabular mt-2 text-2xl font-semibold text-[--color-ink-900]">
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-[--color-ink-500]">{unit}</span> : null}
      </p>
      {helpText ? <p className="mt-1 text-xs text-[--color-ink-500]">{helpText}</p> : null}
    </div>
  );
}
