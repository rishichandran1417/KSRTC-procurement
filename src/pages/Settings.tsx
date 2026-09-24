import { useState, useEffect } from "react";
import { TopBar } from "../components/layout/TopBar";
import {
  isDemoMode,
  setDemoMode,
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
    description: "Backend service exposing endpoints for inventory, purchase orders, and supplier catalogs.",
    icon: Database,
    probePath: "/inventory",
    defaultPlaceholder: "https://your-api.com/api/v1",
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
    description: "Conversational AI Copilot processing user supply chain queries via Gemini 2.5 API.",
    icon: Sparkles,
    probePath: "",
    defaultPlaceholder: "/api/chat",
  },
];

export default function Settings() {
  const [demoActive, setDemoActive] = useState<boolean>(isDemoMode());
  const [showApiDoc, setShowApiDoc] = useState<boolean>(false);

  useEffect(() => {
    const handleConfigChange = () => {
      setDemoActive(isDemoMode());
    };
    window.addEventListener("ksrtc_config_changed", handleConfigChange);
    return () => window.removeEventListener("ksrtc_config_changed", handleConfigChange);
  }, []);

  const toggleDemoMode = () => {
    const next = !demoActive;
    setDemoMode(next);
    setDemoActive(next);
  };

  return (
    <div>
      <TopBar title="Settings → System Integrations" subtitle="Configure and monitor connection status for external services" />

      <div className="p-4 sm:p-6 space-y-5 max-w-6xl">
        {/* Environment Mode Banner */}
        <div className={`rounded-lg border p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
          demoActive
            ? "border-[--color-forecast-500]/40 bg-[--color-forecast-500]/10"
            : "border-[--color-healthy-500]/40 bg-[--color-healthy-500]/10"
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${demoActive ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
              <p className="font-bold text-sm text-[--color-ink-900]">
                {demoActive ? "Demo Mode Active (Simulated Mock Data)" : "Live Production Mode Active (Real Endpoints)"}
              </p>
            </div>
            <p className="mt-1 text-xs text-[--color-ink-600] max-w-2xl leading-relaxed">
              {demoActive
                ? "The application is currently using in-memory mock data so you can safely demo workflows. Toggle to Live Mode to make the frontend call your real hosted API endpoints."
                : "The application is sending all data requests to your configured Service Endpoint URLs. If an endpoint is unreachable, please check CORS and HTTPS settings."}
            </p>
          </div>

          <button
            onClick={toggleDemoMode}
            className={`shrink-0 px-4 py-2 rounded-md font-semibold text-xs border transition-all shadow-sm ${
              demoActive
                ? "bg-[--color-forecast-600] text-white hover:bg-[--color-forecast-700] border-transparent"
                : "bg-[--color-surface-0] text-[--color-ink-800] hover:bg-[--color-surface-1] border-[--color-border]"
            }`}
          >
            {demoActive ? "Switch to Live Backend Mode" : "Switch to Demo Mode"}
          </button>
        </div>

        {/* API Specification Helper Drawer */}
        <div className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-4 text-xs">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowApiDoc(!showApiDoc)}
              className="flex items-center gap-2 font-semibold text-[--color-ink-800] hover:text-[--color-forecast-600]"
            >
              <HelpCircle size={15} />
              <span>How your hosted database API should be structured {showApiDoc ? "▲" : "▼"}</span>
            </button>
            <span className="text-[--color-ink-400] text-[11px]">Backend Requirements</span>
          </div>

          {showApiDoc && (
            <div className="mt-3 pt-3 border-t border-[--color-border] space-y-3 text-[--color-ink-600] leading-relaxed">
              <p>
                <strong>Important:</strong> The frontend cannot connect to a raw PostgreSQL connection string (like <code className="bg-[--color-surface-2] px-1 py-0.5 rounded">postgresql://...:5432</code>) directly from the browser. Your hosted database must be wrapped in a REST API (e.g. Node, Python/FastAPI) that exposes HTTP endpoints.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="bg-[--color-surface-1] p-3 rounded border border-[--color-border]">
                  <p className="font-bold text-[--color-ink-900] mb-1">Expected Endpoints:</p>
                  <ul className="list-disc pl-4 space-y-1 font-mono text-[11px]">
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
                    <li><strong>HTTPS Required:</strong> On Vercel, requests to <code className="text-red-400">http://</code> are blocked by browsers (Mixed Content). Use an <code className="text-emerald-400">https://</code> URL.</li>
                    <li><strong>Enable CORS:</strong> Allow header <code className="text-amber-400">Access-Control-Allow-Origin: *</code> (or <code className="text-amber-400">https://ksrtc-procurement.vercel.app</code>).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {INTEGRATIONS.map((item) => (
            <IntegrationCard key={item.id} integration={item} demoActive={demoActive} />
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  integration,
  demoActive,
}: {
  integration: IntegrationConfig;
  demoActive: boolean;
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
  const isConnected = testResult ? testResult.ok : Boolean(url.trim());

  return (
    <div className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xs">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className="rounded-md p-2.5 bg-[--color-surface-1] text-[--color-forecast-600] shrink-0 mt-0.5">
              <IconComp size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[--color-ink-900]">{integration.name}</p>
              <p className="text-xs text-[--color-ink-500] leading-relaxed mt-0.5">{integration.description}</p>
            </div>
          </div>

          <div
            className={`self-start shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              demoActive
                ? "bg-amber-500/10 text-amber-500"
                : isConnected
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-red-500/10 text-red-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                demoActive ? "bg-amber-400" : isConnected ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            {demoActive ? "Demo Mock" : isConnected ? "Connected" : "Disconnected"}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-[--color-ink-700]">Service Endpoint URL</label>
            {integration.probePath && (
              <span className="text-[10px] text-[--color-ink-400] font-mono">
                Probe test: {integration.probePath}
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
              className="flex-1 rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-mono text-[--color-ink-900] focus:outline-hidden focus:border-[--color-forecast-500]"
            />
            {integration.endpointKey && (
              <button
                onClick={handleSave}
                title="Save URL to browser storage"
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border transition-colors shrink-0 ${
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
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700"
                : "bg-red-500/10 border-red-500/20 text-red-700"
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
          className="flex items-center gap-1.5 rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-medium text-[--color-ink-700] hover:bg-[--color-surface-2] disabled:opacity-50 w-full sm:w-auto justify-center transition-colors"
        >
          <RefreshCw size={12} className={testing ? "animate-spin" : ""} />
          {testing ? "Testing Endpoint…" : "Test Connection"}
        </button>
      </div>
    </div>
  );
}

