import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { TopBar } from "../components/layout/TopBar";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";
import { useFilters } from "../state/FiltersContext";
import { getForecast } from "../services/forecastApi";
import { getInventory } from "../services/inventoryApi";
import { ENDPOINTS } from "../services/apiClient";
import type { ForecastResult } from "../types";
import { Cpu, Settings as SettingsIcon } from "lucide-react";

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
        const msg = err instanceof Error ? err.message : "The external forecasting service could not be reached.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [filters.startDate, filters.endDate, filters.horizon, part, isExternalMlConfigured]); // eslint-disable-line react-hooks/exhaustive-deps

  // Map series data to include confidence range tuple for Recharts Area range plotting
  const chartData = result?.series?.map((item) => ({
    ...item,
    confidenceRange:
      item.lowerBound !== undefined && item.upperBound !== undefined
        ? [item.lowerBound, item.upperBound]
        : undefined,
  })) || [];

  return (
    <div>
      <TopBar title="Demand Forecast" subtitle="What will we need? — External ML demand forecasting" />

      <div className="p-4 sm:p-6 space-y-4">
        {/* ML MODEL STATUS BANNER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-[--color-border] bg-[--color-surface-0] p-4 text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <Cpu size={16} />
            </div>
            <div>
              <p className="font-medium text-[--color-ink-900]">External Machine Learning Forecasting</p>
              <p className="text-xs text-[--color-ink-500] mt-0.5">
                Strictly interfaces with your dedicated external ML model microservice. No client-side computation.
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded border px-2.5 py-1 text-xs font-normal ${
              isExternalMlConfigured
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            {isExternalMlConfigured ? "External ML Connected" : "External ML Not Configured"}
          </span>
        </div>

        {/* INPUT CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[--color-border] bg-[--color-surface-0] p-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <label className="text-xs font-medium text-[--color-ink-600]">Select Part / Item</label>
            <select
              value={part}
              disabled={partOptions.length === 0}
              onChange={(e) => setPart(e.target.value)}
              className="rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-medium text-[--color-ink-900] disabled:opacity-50 flex-1 sm:flex-none cursor-pointer focus:border-blue-500 focus:outline-none"
            >
              {partOptions.length === 0 ? (
                <option value="">No Inventory Items</option>
              ) : (
                partOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))
              )}
            </select>
          </div>

          <div className="text-xs text-[--color-ink-500]">
            Forecast Horizon: <span className="font-medium text-[--color-ink-900]">{filters.horizon} Months</span>
          </div>
        </div>

        {partOptions.length === 0 ? (
          <EmptyState
            title="No inventory items in stock"
            message="Add parts to your inventory database to request demand forecasts."
          />
        ) : !isExternalMlConfigured ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[--color-border] bg-[--color-surface-0] p-8 text-center sm:p-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Cpu size={20} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[--color-ink-900]">
                External ML Forecasting Service Not Connected
              </h3>
              <p className="mt-1 max-w-md text-xs text-[--color-ink-500]">
                Forecasting runs strictly through an external Machine Learning model. Connect your ML API endpoint in Settings to predict demand for {part || "your spare parts"}.
              </p>
            </div>
            <button
              onClick={() => navigate("/settings")}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs transition-all cursor-pointer"
            >
              <SettingsIcon size={14} />
              <span>Configure ML Endpoint in Settings</span>
            </button>
          </div>
        ) : loading ? (
          <LoadingState label={`Requesting demand forecast for ${part} from external ML service…`} />
        ) : error ? (
          <ErrorState title="External ML service error." message={error} onRetry={load} />
        ) : !result || !result.series || result.series.length === 0 ? (
          <EmptyState
            title={`No forecast points returned for ${part}`}
            message="The external ML service did not return any forecast records for this part."
          />
        ) : (
          <>
            {/* MODEL EVALUATION METRICS */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "External Model Name", value: result.modelName || "ML Service" },
                { label: "MAE (Mean Abs Error)", value: (result.mae ?? 0).toFixed(1) },
                { label: "RMSE (Root Mean Sq)", value: (result.rmse ?? 0).toFixed(1) },
                { label: "MAPE (Error Rate)", value: `${(result.mape ?? 0).toFixed(1)}%` },
                { label: "Model Bias", value: (result.bias ?? 0).toFixed(1) },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-3">
                  <p className="text-xs text-[--color-ink-500] truncate font-normal">{m.label}</p>
                  <p className="tabular mt-1 text-sm font-medium text-[--color-ink-900] truncate">{m.value}</p>
                </div>
              ))}
            </div>

            {/* DEMAND FORECAST CHART & BAND */}
            <div className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-4">
              <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <p className="text-xs font-medium text-[--color-ink-900]">
                  {part} — Historical Demand vs. External ML Forecast
                </p>
                <p className="text-xs text-[--color-ink-500] font-normal">
                  Includes 95% Confidence Interval Band
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
                      fillOpacity={0.15}
                      name="95% Confidence Band"
                    />
                    <Line type="monotone" dataKey="actual" stroke="var(--color-ink-600)" strokeWidth={1.75} dot={false} name="Historical Demand" />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="var(--color-forecast-500)"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={false}
                      name="External ML Forecast"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FORECAST DATA TABLE */}
            <div className="rounded-lg border border-[--color-border] bg-[--color-surface-0] overflow-hidden">
              <div className="border-b border-[--color-border] px-4 py-2.5 text-xs font-medium text-[--color-ink-700]">
                External ML Forecast Data Breakdown
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-[--color-border] text-left text-xs font-medium text-[--color-ink-500]">
                      <th className="px-4 py-2.5">Period</th>
                      <th className="px-2 py-2.5">Historical Demand</th>
                      <th className="px-2 py-2.5">ML Forecast</th>
                      <th className="px-2 py-2.5">Lower Bound (95%)</th>
                      <th className="px-2 py-2.5">Upper Bound (95%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--color-border]">
                    {result.series.map((point) => (
                      <tr key={point.period} className="hover:bg-[--color-surface-1] transition-colors">
                        <td className="px-4 py-2 font-medium text-[--color-ink-900]">{point.period}</td>
                        <td className="tabular px-2 py-2 text-[--color-ink-700]">{point.actual !== undefined ? point.actual : "—"}</td>
                        <td className="tabular px-2 py-2 font-medium text-blue-600 dark:text-blue-400">{point.forecast !== undefined ? point.forecast : "—"}</td>
                        <td className="tabular px-2 py-2 text-[--color-ink-500]">{point.lowerBound !== undefined ? point.lowerBound : "—"}</td>
                        <td className="tabular px-2 py-2 text-[--color-ink-500]">{point.upperBound !== undefined ? point.upperBound : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
