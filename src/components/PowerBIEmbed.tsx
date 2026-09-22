import { useState } from "react";
import { Maximize2, RefreshCw } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "./ui/States";
import type { PowerBIConfig } from "../types";

export function PowerBIEmbed({
  config,
  loading,
  error,
  onRetry,
}: {
  config: PowerBIConfig | null;
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div
      className={`flex flex-col rounded-md border border-[--color-border] bg-[--color-surface-0] ${
        isFullscreen ? "fixed inset-4 z-50 shadow-xl" : "h-[560px]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[--color-border] px-4 py-2.5">
        <p className="text-sm font-medium text-[--color-ink-900]">Vendor Performance Analytics Report</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="rounded p-1.5 text-[--color-ink-500] hover:bg-[--color-surface-1]"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setIsFullscreen((f) => !f)}
            className="rounded p-1.5 text-[--color-ink-500] hover:bg-[--color-surface-1]"
            title="Full screen"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-3">
        {loading ? (
          <LoadingState label="Loading Power BI report…" />
        ) : error ? (
          <ErrorState title="Unable to load Power BI report." message={error} onRetry={onRetry} />
        ) : !config?.embedUrl ? (
          <EmptyState
            title="No Power BI report connected"
            message="Add an embed URL under Settings → Integrations to display live analytics here."
          />
        ) : (
          <iframe
            key={refreshKey}
            title="Power BI Report"
            src={config.embedUrl}
            className="h-full w-full rounded border border-[--color-border]"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
