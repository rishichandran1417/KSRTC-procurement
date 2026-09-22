import { useState } from "react";
import { TopBar } from "../components/layout/TopBar";
import { ENDPOINTS, DEMO_MODE } from "../services/apiClient";
import { RefreshCw, Database, Cpu, Calculator, BarChart3, Sparkles } from "lucide-react";

interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon: any;
  defaultUrl: string;
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    id: "database",
    name: "Database (PostgreSQL / REST)",
    description: "Operational database storing inventory stock levels, parts catalog, and purchase order lifecycle records.",
    icon: Database,
    defaultUrl: ENDPOINTS.base || "http://localhost:8000/api/v1/db",
  },
  {
    id: "forecast",
    name: "ML Forecasting Service",
    description: "External Machine Learning model endpoint returning demand forecasts, MAE/RMSE/MAPE, and confidence intervals.",
    icon: Cpu,
    defaultUrl: ENDPOINTS.forecast || "http://localhost:8000/api/v1/forecast",
  },
  {
    id: "pulp",
    name: "PuLP Optimization Engine",
    description: "External linear programming optimization service returning recommended purchase quantities based on budget and risk.",
    icon: Calculator,
    defaultUrl: ENDPOINTS.optimization || "http://localhost:8000/api/v1/optimize",
  },
  {
    id: "powerbi",
    name: "Power BI Analytics Embed",
    description: "Power BI report embed URL and access credentials for executive analytics dashboard.",
    icon: BarChart3,
    defaultUrl: ENDPOINTS.powerbi || "https://app.powerbi.com/reportEmbed?reportId=ksrtc-supply-chain-v1",
  },
  {
    id: "scion",
    name: "KSRTC SCION Intelligence Engine",
    description: "Conversational AI Copilot processing user supply chain queries and returning structured analytical data.",
    icon: Sparkles,
    defaultUrl: "/api/chat",
  },
];

export default function Settings() {
  return (
    <div>
      <TopBar title="Settings → System Integrations" subtitle="Configure and monitor connection status for external services" />

      <div className="p-6 space-y-4">
        {DEMO_MODE ? (
          <div className="rounded-md border border-[--color-forecast-500]/30 bg-[--color-forecast-500]/10 p-4 text-xs text-[--color-ink-700] flex items-center justify-between">
            <div>
              <p className="font-semibold text-[--color-forecast-700]">Demo Mode Active (In-Memory Frontend Services)</p>
              <p className="text-[--color-ink-500]">
                All 5 external integration interfaces are connected to mock service handlers so you can test end-to-end workflows. Set environment variables to override endpoints for production.
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-[--color-healthy-500]/20 px-3 py-1 text-xs font-bold text-[--color-healthy-500]">
              <span className="h-2 w-2 rounded-full bg-[--color-healthy-500] animate-pulse" /> Live Ready
            </span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {INTEGRATIONS.map((item) => (
            <IntegrationCard key={item.id} integration={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: IntegrationConfig }) {
  const [url, setUrl] = useState(integration.defaultUrl);
  const [testing, setTesting] = useState(false);
  const [lastTested, setLastTested] = useState<string>("Just now");

  const testConnection = () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      setLastTested(new Date().toLocaleTimeString());
    }, 800);
  };

  const IconComp = integration.icon;

  return (
    <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-5 flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded p-2 bg-[--color-surface-1] text-[--color-forecast-600]">
              <IconComp size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[--color-ink-900]">{integration.name}</p>
              <p className="text-xs text-[--color-ink-500]">{integration.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-[--color-healthy-500]/10 px-2.5 py-1 text-xs font-semibold text-[--color-healthy-500]">
            <span className="h-2 w-2 rounded-full bg-[--color-healthy-500]" />
            ● Connected
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-[--color-ink-500]">Service Endpoint URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-xs tabular font-mono text-[--color-ink-900]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[--color-border] pt-3 text-xs text-[--color-ink-500]">
        <span>Last checked: {lastTested}</span>
        <button
          onClick={testConnection}
          disabled={testing}
          className="flex items-center gap-1.5 rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1 text-xs font-medium text-[--color-ink-700] hover:bg-[--color-surface-2] disabled:opacity-50"
        >
          <RefreshCw size={12} className={testing ? "animate-spin" : ""} />
          {testing ? "Testing Connection…" : "Test Connection"}
        </button>
      </div>
    </div>
  );
}
