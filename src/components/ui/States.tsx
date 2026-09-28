import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";

export function LoadingState({
  label = "Loading records…",
  description,
  rows = 3,
}: {
  label?: string;
  description?: string;
  rows?: number;
}) {
  return (
    <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-6 text-center shadow-2xs">
      <div className="flex flex-col items-center justify-center gap-2">
        <Loader2 size={20} className="animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-xs font-semibold text-[--color-ink-900]">{label}</p>
        {description ? (
          <p className="max-w-md text-[11px] text-[--color-ink-500]">{description}</p>
        ) : null}
      </div>

      {rows > 0 && (
        <div className="mt-4 space-y-2 max-w-lg mx-auto opacity-40">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="h-2.5 rounded bg-[--color-surface-2] animate-pulse"
              style={{ width: `${85 - i * 15}%`, margin: "0 auto" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Service Unavailable",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-md border border-rose-500/25 bg-rose-50/50 dark:bg-rose-950/20 p-5 text-center shadow-2xs">
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="rounded-full bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <AlertCircle size={18} />
        </div>
        <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">{title}</p>
        {message ? (
          <p className="max-w-md text-[11px] text-[--color-ink-600] leading-relaxed">
            {message}
          </p>
        ) : (
          <p className="max-w-md text-[11px] text-[--color-ink-500]">
            The requested data could not be retrieved from the central backend service.
          </p>
        )}
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-rose-300 dark:border-rose-800 bg-[--color-surface-0] px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shadow-2xs"
          >
            Retry Connection
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  message?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
}) {
  const ActionIcon = action?.icon;

  return (
    <div className="rounded-md border border-dashed border-[--color-border] bg-[--color-surface-0] p-8 text-center shadow-2xs">
      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
        <div className="rounded-md bg-[--color-surface-1] p-2.5 text-[--color-ink-400] border border-[--color-border]">
          <Icon size={20} />
        </div>
        <p className="text-xs font-semibold text-[--color-ink-900]">{title}</p>
        {message ? (
          <p className="text-[11px] text-[--color-ink-500] leading-relaxed">{message}</p>
        ) : null}
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-98 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer"
          >
            {ActionIcon ? <ActionIcon size={13} /> : null}
            <span>{action.label}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
