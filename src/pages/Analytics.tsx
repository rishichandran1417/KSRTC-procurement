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
    getPowerBIConfig().then(setConfig).catch(() => setError("Could not reach Power BI service.")).finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <TopBar title="Power BI Analytics" subtitle="How is the supply chain performing? — Executive reporting dashboard" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 rounded-md border border-[--color-border] bg-[--color-surface-1] p-3 text-xs text-[--color-ink-700]">
          <BarChart3 className="text-[--color-forecast-600]" size={18} />
          <span>
            This dedicated container renders your Power BI report iframe. Configure your Power BI Embed URL and access tokens under <strong>Settings → Integrations</strong>.
          </span>
        </div>

        <PowerBIEmbed config={config} loading={loading} error={error} onRetry={load} />

        <p className="text-xs text-[--color-ink-500]">
          Covers overall fleet demand trends, inventory turnover rate, stockout frequency, supplier delivery performance,
          procurement budget allocation, and historical price variances across KSRTC depots.
        </p>
      </div>
    </div>
  );
}
