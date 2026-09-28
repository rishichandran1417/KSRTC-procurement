import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TopBar } from "../components/layout/TopBar";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";
import { useFilters } from "../state/FiltersContext";
import { getForecast } from "../services/forecastApi";
import { getInventory } from "../services/inventoryApi";
import { ENDPOINTS } from "../services/apiClient";
import type { ForecastResult } from "../types";
import {
  Cpu,
  Settings as SettingsIcon,
  Play,
  Calculator,
  ArrowRight,
} from "lucide-react";

export default function Forecast() {
  const navigate = useNavigate();
  const { filters } = useFilters();
  const [partOptions, setPartOptions] = useState<string[]>([]);
  const [part, setPart] = useState("");
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExternalMlConfigured = Boolean(ENDPOINTS.forecast);

  useEffect(() => {
    getInventory().then((inv) => {
      if (inv.length > 0) {
        const unique = Array.from(new Set(inv.map((i) => i.part)));
        setPartOptions(unique);
        setPart(unique[0]);
      } else {
        setPartOptions([]);
        setPart("");
        setResult(null);
        setLoading(false);
      }
    });
  }, []);

  const load = () => {
    if (!part) {
      setLoading(false);
      setResult(null);
      return;
    }

    if (!isExternalMlConfigured) {
      setLoading(false);
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    getForecast({
      part,
      start_date: filters.startDate,
      end_date: filters.endDate,
      horizon: filters.horizon,
    })
      .then(setResult)
      .catch((err) => {
        const msg =
          err instanceof Error
            ? err.message
            : "The external forecasting service could not be reached.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [filters.startDate, filters.endDate, filters.horizon, part, isExternalMlConfigured]); // eslint-disable-line react-hooks/exhaustive-deps

  // Map series data to include confidence range tuple for Recharts Area range plotting
  const chartData =
    result?.series?.map((item) => ({
      ...item,
      confidenceRange:
        item.lowerBound !== undefined && item.upperBound !== undefined
          ? [item.lowerBound, item.upperBound]
          : undefined,
    })) || [];

  return (
    <div>
      <TopBar
        title="Demand Forecasting"
        subtitle="Predict spare part consumption, evaluate ML model confidence bands, and support inventory planning"
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* OPERATIONAL 4-STEP WORKFLOW BAR */}
        <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-3 text-xs shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[--color-ink-400]">
                Planning Workflow:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-[--color-ink-700]">
                <span className="px-2 py-0.5 rounded bg-[--color-surface-2] font-semibold text-[--color-ink-900]">
                  1. Input Data
                </span>
                <span className="text-[--color-ink-400]">→</span>
                <span className="px-2 py-0.5 rounded bg-[--color-surface-2] font-semibold text-[--color-ink-900]">
                  2. External ML Model
                </span>
                <span className="text-[--color-ink-400]">→</span>
                <span className={`px-2 py-0.5 rounded font-semibold ${result ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" : "bg-[--color-surface-2] text-[--color-ink-900]"}`}>
                  3. Forecast Results
                </span>
                <span className="text-[--color-ink-400]">→</span>
                <span className="px-2 py-0.5 rounded bg-[--color-surface-2] font-semibold text-[--color-ink-900]">
                  4. Planning Action
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-[11px] font-medium border ${
                  isExternalMlConfigured
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isExternalMlConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span>{isExternalMlConfigured ? "External ML Service Active" : "ML Endpoint Offline"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* INPUT PARAMETERS */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[--color-border] bg-[--color-surface-0] p-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <label className="text-xs font-semibold text-[--color-ink-700]">Part / Component:</label>
            <select
              value={part}
              disabled={partOptions.length === 0}
              onChange={(e) => setPart(e.target.value)}
              className="rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-semibold text-[--color-ink-900] disabled:opacity-50 flex-1 sm:flex-none cursor-pointer focus:border-blue-500 focus:outline-none"
            >
              {partOptions.length === 0 ? (
                <option value="">No Inventory Items</option>
              ) : (
                partOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs text-[--color-ink-500]">
            <span>
              Forecast Horizon: <strong className="text-[--color-ink-900]">{filters.horizon} Months</strong>
            </span>
            <span className="text-[--color-border-strong]">•</span>
            <span>
              Status:{" "}
              <strong className={result ? "text-emerald-600 dark:text-emerald-400" : "text-[--color-ink-700]"}>
                {loading ? "Generating forecast…" : result ? "Forecast generated" : "No forecast generated"}
              </strong>
            </span>
          </div>
        </div>

        {partOptions.length === 0 ? (
          <EmptyState
            title="No inventory items in database"
            message="Register spare parts in Central Inventory to request machine learning demand forecasts."
            action={{
              label: "Add Inventory Item",
              onClick: () => navigate("/inventory"),
            }}
          />
        ) : !isExternalMlConfigured ? (
          <EmptyState
            title="External ML Forecasting Service Not Connected"
            message={`Forecasting runs strictly through an external Machine Learning model. Connect your ML API endpoint in Settings to predict demand for ${part || "fleet spares"}.`}
            icon={Cpu}
            action={{
              label: "Configure ML Endpoint in Settings",
              onClick: () => navigate("/settings/integrations"),
              icon: SettingsIcon,
            }}
          />
        ) : loading ? (
          <LoadingState
            label="Generating forecast…"
            description={`Submitting historical consumption parameters for "${part}" to external ML regression model…`}
          />
        ) : error ? (
          <ErrorState
            title="Forecast service unavailable"
            message={error}
            onRetry={load}
          />
        ) : !result || !result.series || result.series.length === 0 ? (
          <EmptyState
            title="No forecast generated"
            message={`The external forecasting model did not return any forecast records for ${part}. Verify that consumption history is registered for this part.`}
            action={{
              label: "Retry Forecast Query",
              onClick: load,
            }}
          />
        ) : (
          <>
            {/* MODEL EVALUATION METRICS */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Model Architecture", value: result.modelName || "XGBoost Regressor" },
                { label: "Mean Abs Error (MAE)", value: (result.mae ?? 0).toFixed(2) },
                { label: "Root Mean Sq (RMSE)", value: (result.rmse ?? 0).toFixed(2) },
                { label: "MAPE Error Rate", value: `${(result.mape ?? 0).toFixed(1)}%` },
                { label: "Model Bias", value: (result.bias ?? 0).toFixed(2) },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-3 shadow-2xs"
                >
                  <p className="text-[10px] uppercase font-semibold text-[--color-ink-500] truncate">
                    {m.label}
                  </p>
                  <p className="tabular mt-1 text-sm font-bold text-[--color-ink-900] truncate">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {/* DEMAND FORECAST CHART */}
            <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-4 shadow-2xs">
              <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <p className="text-xs font-bold text-[--color-ink-900]">
                  {part} — Historical Consumption vs. ML Demand Projections
                </p>
                <p className="text-[11px] text-[--color-ink-500]">
                  Includes 95% Confidence Interval Prediction Band
                </p>
              </div>

              <div className="h-[280px] sm:h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="var(--color-ink-400)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-ink-400)" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Area
                      type="monotone"
                      dataKey="confidenceRange"
                      stroke="none"
                      fill="var(--color-forecast-500)"
                      fillOpacity={0.12}
                      name="95% Confidence Band"
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="var(--color-ink-600)"
                      strokeWidth={2}
                      dot={false}
                      name="Historical Consumption"
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="var(--color-forecast-500)"
                      strokeWidth={2.25}
                      strokeDasharray="4 3"
                      dot={false}
                      name="ML Forecast Demand"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FORECAST DATA TABLE */}
            <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] overflow-hidden shadow-2xs">
              <div className="border-b border-[--color-border] px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-[--color-ink-700] bg-[--color-surface-1]">
                Forecast Data Breakdown (Units)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[520px]">
                  <thead>
                    <tr className="border-b border-[--color-border] bg-[--color-surface-1]/60 text-left text-[11px] font-semibold uppercase tracking-wider text-[--color-ink-500]">
                      <th className="px-3.5 py-2.5">Period</th>
                      <th className="px-3 py-2.5 text-right">Historical Consumption</th>
                      <th className="px-3 py-2.5 text-right">ML Forecast</th>
                      <th className="px-3 py-2.5 text-right">Lower Bound (95%)</th>
                      <th className="px-3 py-2.5 text-right">Upper Bound (95%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--color-border]">
                    {result.series.map((point) => (
                      <tr key={point.period} className="hover:bg-[--color-surface-1]/60 transition-colors">
                        <td className="px-3.5 py-2 font-medium text-[--color-ink-900]">{point.period}</td>
                        <td className="tabular px-3 py-2 text-right text-[--color-ink-700]">
                          {point.actual !== undefined ? point.actual.toLocaleString("en-IN") : "—"}
                        </td>
                        <td className="tabular px-3 py-2 text-right font-bold text-blue-600 dark:text-blue-400">
                          {point.forecast !== undefined ? point.forecast.toLocaleString("en-IN") : "—"}
                        </td>
                        <td className="tabular px-3 py-2 text-right text-[--color-ink-500]">
                          {point.lowerBound !== undefined ? point.lowerBound.toLocaleString("en-IN") : "—"}
                        </td>
                        <td className="tabular px-3 py-2 text-right text-[--color-ink-500]">
                          {point.upperBound !== undefined ? point.upperBound.toLocaleString("en-IN") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PLANNING DECISION ACTION BANNER */}
            <div className="rounded-md border border-[--color-border] bg-[--color-surface-1] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div>
                <p className="text-xs font-bold text-[--color-ink-900]">Operational Planning Decision</p>
                <p className="text-[11px] text-[--color-ink-500] mt-0.5">
                  Use this ML forecast to run PuLP mathematical procurement optimization or create a direct purchase order.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/procurement")}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[--color-border] bg-[--color-surface-0] hover:bg-[--color-surface-2] px-3 py-1.5 text-xs font-semibold text-[--color-ink-800] transition-colors cursor-pointer shadow-2xs"
                >
                  <Calculator size={13} className="text-purple-600 dark:text-purple-400" />
                  <span>Run PuLP Optimizer</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate("/purchase-orders/new", {
                      state: {
                        queryPart: part,
                        notes: `Procurement based on ML forecast demand for ${part}`,
                      },
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-98 px-3.5 py-1.5 text-xs font-semibold text-white transition-all cursor-pointer shadow-2xs"
                >
                  <Play size={12} className="fill-white" />
                  <span>Create Purchase Order</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
