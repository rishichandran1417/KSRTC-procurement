import { useState, useEffect } from "react";
import { TopBar } from "../components/layout/TopBar";
import {
  getEndpoint,
  setEndpoint,
  testEndpoint,
  type EndpointKey,
  type ConnectionTestResult,
} from "../services/apiClient";
import {
  RefreshCw,
  Database,
  Cpu,
  Calculator,
  BarChart3,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Save,
  HelpCircle,
} from "lucide-react";

interface IntegrationConfig {
  id: string;
  endpointKey?: EndpointKey;
  name: string;
  description: string;
  icon: any;
  probePath: string;
  defaultPlaceholder: string;
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    id: "database",
    endpointKey: "base",
    name: "Database (PostgreSQL / REST API)",
    description: "Central source-of-truth backend exposing endpoints for inventory, purchase orders, and supplier catalogs.",
    icon: Database,
    probePath: "/health",
    defaultPlaceholder: "https://database-5oe4.onrender.com/api/v1/db",
  },
  {
    id: "forecast",
    endpointKey: "forecast",
    name: "ML Forecasting Service",
    description: "External Machine Learning model endpoint returning demand forecasts and confidence intervals.",
    icon: Cpu,
    probePath: "/forecast",
    defaultPlaceholder: "https://your-forecast-api.com",
  },
  {
    id: "pulp",
    endpointKey: "optimization",
    name: "PuLP Optimization Engine",
    description: "External linear programming optimization service returning recommended purchase quantities.",
    icon: Calculator,
    probePath: "/optimize",
    defaultPlaceholder: "https://your-pulp-api.com",
  },
  {
    id: "powerbi",
    endpointKey: "powerbi",
    name: "Power BI Analytics Embed",
    description: "Power BI report embed URL for executive analytics dashboard.",
    icon: BarChart3,
    probePath: "",
    defaultPlaceholder: "https://app.powerbi.com/reportEmbed?reportId=...",
  },
  {
    id: "scion",
    name: "KSRTC SCION Intelligence Engine",
    description: "Conversational AI Copilot processing user supply chain queries via Gemini API.",
    icon: Sparkles,
    probePath: "",
    defaultPlaceholder: "/api/chat",
  },
];

export default function Settings() {
  const [showApiDoc, setShowApiDoc] = useState<boolean>(false);

  return (
    <div>
      <TopBar title="Settings → System Integrations" subtitle="Configure and monitor connection status for external services" />

      <div className="p-4 sm:p-6 space-y-5 max-w-6xl">
        {/* API Specification Helper Drawer */}
        <div className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-4 text-xs">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowApiDoc(!showApiDoc)}
              className="flex items-center gap-2 font-semibold text-[--color-ink-800] hover:text-[--color-forecast-600] cursor-pointer"
            >
              <HelpCircle size={15} />
              <span>How your hosted database API should be structured {showApiDoc ? "▲" : "▼"}</span>
            </button>
            <span className="text-[--color-ink-400] text-[11px]">Backend Requirements</span>
          </div>

          {showApiDoc && (
            <div className="mt-3 pt-3 border-t border-[--color-border] space-y-3 text-[--color-ink-600] leading-relaxed">
              <p>
                <strong>Central Source of Truth:</strong> The frontend connects directly to your hosted FastAPI backend at <code className="bg-[--color-surface-2] px-1 py-0.5 rounded text-[--color-ink-900]">/api/v1/db</code>. All inventory, suppliers, and purchase orders are persisted in PostgreSQL.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="bg-[--color-surface-1] p-3 rounded border border-[--color-border]">
                  <p className="font-bold text-[--color-ink-900] mb-1">Expected Endpoints:</p>
                  <ul className="list-disc pl-4 space-y-1 font-mono text-[11px]">
                    <li><strong className="text-emerald-500">GET</strong> /health - verifies database connectivity</li>
                    <li><strong className="text-emerald-500">GET</strong> /inventory - returns item list</li>
                    <li><strong className="text-blue-500">POST</strong> /inventory - creates new item</li>
                    <li><strong className="text-emerald-500">GET</strong> /purchase-orders - returns PO list</li>
                    <li><strong className="text-blue-500">POST</strong> /purchase-orders - creates PO</li>
                    <li><strong className="text-emerald-500">GET</strong> /suppliers - returns supplier list</li>
                  </ul>
                </div>
                <div className="bg-[--color-surface-1] p-3 rounded border border-[--color-border]">
                  <p className="font-bold text-[--color-ink-900] mb-1">Critical Setup for Hosted APIs:</p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li><strong>HTTPS Required:</strong> Browsers block unencrypted <code className="text-red-400">http://</code> endpoints (Mixed Content). Always use an <code className="text-emerald-400">https://</code> URL.</li>
                    <li><strong>Enable CORS:</strong> Allow origin <code className="text-amber-400">Access-Control-Allow-Origin: *</code> on your FastAPI backend.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {INTEGRATIONS.map((item) => (
            <IntegrationCard key={item.id} integration={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  integration,
}: {
  integration: IntegrationConfig;
}) {
  const initialUrl = integration.endpointKey ? getEndpoint(integration.endpointKey) : "";
  const [url, setUrl] = useState<string>(initialUrl);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  useEffect(() => {
    if (integration.endpointKey) {
      setUrl(getEndpoint(integration.endpointKey));
    }
  }, [integration.endpointKey]);

  const handleSave = () => {
    if (integration.endpointKey) {
      setEndpoint(integration.endpointKey, url);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setTestResult({
        ok: false,
        latencyMs: 0,
        message: "Please enter an endpoint URL first.",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    // Save automatically before testing
    if (integration.endpointKey) {
      setEndpoint(integration.endpointKey, url);
    }

    const res = await testEndpoint(url, integration.probePath);
    setTesting(false);
    setTestResult(res);
  };

  const IconComp = integration.icon;
  const isConfigured = Boolean(url.trim());

  return (
    <div className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xs">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className="rounded-md p-2.5 bg-[--color-surface-1] text-blue-500 shrink-0 mt-0.5">
              <IconComp size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[--color-ink-900]">{integration.name}</p>
              <p className="text-xs text-[--color-ink-500] leading-relaxed mt-0.5">{integration.description}</p>
            </div>
          </div>

          <div
            className={`self-start shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              testResult
                ? testResult.ok
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
                : isConfigured
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                testResult
                  ? testResult.ok
                    ? "bg-emerald-500"
                    : "bg-red-500"
                  : isConfigured
                  ? "bg-blue-500"
                  : "bg-zinc-400"
              }`}
            />
            {testResult
              ? testResult.ok
                ? `Connected (${testResult.latencyMs}ms)`
                : "Connection Error"
              : isConfigured
              ? "Configured"
              : "Not Configured"}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-[--color-ink-700]">Service Endpoint URL</label>
            {integration.probePath && (
              <span className="text-[10px] text-[--color-ink-400] font-mono">
                Probe: {integration.probePath}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setIsSaved(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder={integration.defaultPlaceholder}
              className="flex-1 rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-mono text-[--color-ink-900] focus:outline-hidden focus:border-blue-500"
            />
            {integration.endpointKey && (
              <button
                onClick={handleSave}
                title="Save URL to browser storage"
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border transition-colors shrink-0 cursor-pointer ${
                  isSaved
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-[--color-border] bg-[--color-surface-1] text-[--color-ink-700] hover:bg-[--color-surface-2]"
                }`}
              >
                {isSaved ? <CheckCircle2 size={13} /> : <Save size={13} />}
                {isSaved ? "Saved" : "Save"}
              </button>
            )}
          </div>
        </div>

        {/* Live Test Results Box */}
        {testResult && (
          <div
            className={`mt-3 rounded p-2.5 text-xs flex items-start gap-2 border ${
              testResult.ok
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-600" />
            )}
            <div className="flex-1 leading-snug">
              <p className="font-semibold">{testResult.ok ? "Connection Successful" : "Connection Check Failed"}</p>
              <p className="mt-0.5 opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-[--color-border] pt-3 text-xs text-[--color-ink-500]">
        <span>
          {integration.endpointKey ? (url ? "Saved locally in browser" : "No custom URL configured") : "Built-in server endpoint"}
        </span>
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="flex items-center gap-1.5 rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-medium text-[--color-ink-700] hover:bg-[--color-surface-2] disabled:opacity-50 w-full sm:w-auto justify-center transition-colors cursor-pointer"
        >
          <RefreshCw size={12} className={testing ? "animate-spin" : ""} />
          {testing ? "Testing Endpoint…" : "Test Connection"}
        </button>
      </div>
    </div>
  );
}
