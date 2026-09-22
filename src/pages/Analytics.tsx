import { useEffect, useState } from "react";
import { TopBar } from "../components/layout/TopBar";
import { PowerBIEmbed } from "../components/PowerBIEmbed";
import { getPowerBIConfig } from "../services/powerbiApi";
import type { PowerBIConfig } from "../types";
import { BarChart3 } from "lucide-react";

export default function Analytics() {
  const [config, setConfig] = useState<PowerBIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getPowerBIConfig()
      .then(setConfig)
      .catch(() => setError("Could not reach Vendor Performance analytics service."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <TopBar
        title="Vendor Performance Analytics"
        subtitle="Evaluate supplier delivery compliance, lead times, quality scores, and price variance reports"
      />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 rounded-md border border-[--color-border] bg-[--color-surface-1] p-3 text-xs text-[--color-ink-700]">
          <BarChart3 className="text-[--color-forecast-600]" size={18} />
          <span>
            This container renders your interactive Vendor Performance analytics dashboard. Configure your embed URL under <strong>Settings → Integrations</strong>.
          </span>
        </div>

        <PowerBIEmbed config={config} loading={loading} error={error} onRetry={load} />

        <p className="text-xs text-[--color-ink-500]">
          Covers vendor/supplier delivery lead times, on-time in-full (OTIF) fulfillment rates, quality rejection counts, unit cost variance, and depot supplier performance rankings across KSRTC workshops.
        </p>
      </div>
    </div>
  );
}
