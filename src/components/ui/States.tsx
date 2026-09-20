import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[--color-border] text-[--color-ink-500]">
      <RefreshCw size={18} className="animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-md border border-[--color-critical-500]/20 bg-[--color-critical-50] text-center">
      <AlertTriangle size={18} className="text-[--color-critical-500]" />
      <p className="text-sm font-medium text-[--color-critical-500]">{title}</p>
      {message ? <p className="max-w-sm text-xs text-[--color-ink-500]">{message}</p> : null}
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-1 rounded border border-[--color-critical-500]/30 bg-[--color-surface-0] px-3 py-1 text-xs font-medium text-[--color-critical-500] hover:bg-[--color-surface-1]"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[--color-border] text-center text-[--color-ink-500]">
      <Inbox size={18} />
      <p className="text-sm font-medium">{title}</p>
      {message ? <p className="max-w-sm text-xs">{message}</p> : null}
    </div>
  );
}
