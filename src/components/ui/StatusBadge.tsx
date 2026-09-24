type Tone = "healthy" | "warning" | "critical" | "neutral" | "forecast" | "optimize";

const TONE_CLASSES: Record<Tone, string> = {
  healthy: "bg-[--color-healthy-50] text-[--color-healthy-600] border-[--color-healthy-500]/25",
  warning: "bg-[--color-warning-50] text-[--color-warning-600] border-[--color-warning-500]/25",
  critical: "bg-[--color-critical-50] text-[--color-critical-600] border-[--color-critical-500]/25",
  neutral: "bg-[--color-surface-2] text-[--color-ink-500] border-[--color-border]",
  forecast: "bg-[--color-forecast-50] text-[--color-forecast-700] border-[--color-forecast-500]/25",
  optimize: "bg-[--color-optimize-50] text-[--color-optimize-700] border-[--color-optimize-500]/25",
};

export function toneForStatus(status: string): Tone {
  const s = status.toLowerCase();
  if (["healthy", "received", "closed", "connected", "low"].includes(s)) return "healthy";
  if (["warning", "medium", "partially received", "submitted", "draft"].includes(s)) return "warning";
  if (["critical", "high", "cancelled"].includes(s)) return "critical";
  return "neutral";
}

export function StatusBadge({ label, tone }: { label: string; tone?: Tone }) {
  const resolved = tone ?? toneForStatus(label);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight ${TONE_CLASSES[resolved]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}
