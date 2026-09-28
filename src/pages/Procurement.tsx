import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Calculator, ArrowRight, CheckSquare, Boxes } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useFilters } from "../state/FiltersContext";
import { runOptimization } from "../services/procurementApi";
import type { ProcurementResult } from "../types";

function formatLakhs(n: number) {
  if (n >= 10000000) {
    const cr = n / 10000000;
    return `₹${cr.toFixed(2)} Cr`;
  }
  if (n >= 100000) {
    const lk = n / 100000;
    return `₹${lk.toFixed(2)} L`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function Procurement() {
  const { filters } = useFilters();
  const navigate = useNavigate();

  const [budget, setBudget] = useState(0);
  const [serviceLevel, setServiceLevel] = useState(0.95);
  const [result, setResult] = useState<ProcurementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const run = () => {
    setLoading(true);
    setError(null);
    runOptimization({
      budget,
      forecast_horizon: filters.horizon,
      service_level: serviceLevel,
    })
      .then((r) => {
        setResult(r);
        setSelected(new Set(r.items.map((_, i) => i)));
      })
      .catch(() => setError("The external PuLP linear programming service could not be reached."))
      .finally(() => setLoading(false));
  };

  const createPO = () => {
    if (!result) return;
    const items = result.items.filter((_, i) => selected.has(i));
    navigate("/purchase-orders/new", {
      state: {
        items,
        source: "pulp",
        notes: "Pre-populated from PuLP Optimization Model Recommendation",
      },
    });
  };

  return (
    <div>
      <TopBar
        title="Procurement Optimization"
        subtitle="Mathematical linear programming solver calculating optimal purchase quantities under budget and safety stock constraints"
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* OPERATIONAL WORKFLOW PIPELINE */}
        <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-3 text-xs shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[--color-ink-400]">
                PuLP Solver Architecture:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-[--color-ink-700]">
                <span className="px-2 py-0.5 rounded bg-[--color-surface-2] font-semibold text-[--color-ink-900]">
                  Inventory Deficits
                </span>
                <span className="text-[--color-ink-400]">+</span>
                <span className="px-2 py-0.5 rounded bg-[--color-surface-2] font-semibold text-[--color-ink-900]">
                  Demand Forecast
                </span>
                <span className="text-[--color-ink-400]">+</span>
                <span className="px-2 py-0.5 rounded bg-[--color-surface-2] font-semibold text-[--color-ink-900]">
                  Budget Cap
                </span>
                <span className="text-[--color-ink-400]">→</span>
                <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold border border-purple-500/20">
                  Linear Program Solver
                </span>
                <span className="text-[--color-ink-400]">→</span>
                <span className="px-2 py-0.5 rounded bg-[--color-surface-2] font-semibold text-[--color-ink-900]">
                  Purchase Allocation
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-[11px] font-medium border border-purple-500/25 bg-purple-500/10 text-purple-700 dark:text-purple-300">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                <span>PuLP Solver Ready</span>
              </span>
            </div>
          </div>
        </div>

        {/* PARAMETER INPUTS */}
        <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-4 shadow-2xs">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[--color-ink-500]">
            Solver Constraints & Inputs
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end flex-wrap gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <label className="mb-1 block text-xs font-semibold text-[--color-ink-600]">
                Planning Horizon
              </label>
              <div className="rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-semibold text-[--color-ink-900]">
                {filters.horizon} Months (Global)
              </div>
            </div>

            <div className="w-full sm:w-auto">
              <label className="mb-1 block text-xs font-semibold text-[--color-ink-600]">
                Available Procurement Budget (₹)
              </label>
              <input
                type="number"
                step="10000"
                min="0"
                value={budget || ""}
                placeholder="0 for unconstrained"
                onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                className="w-full sm:w-48 rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs tabular font-bold text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="w-full sm:w-auto">
              <label className="mb-1 block text-xs font-semibold text-[--color-ink-600]">
                Target Service Level
              </label>
              <select
                value={serviceLevel}
                onChange={(e) => setServiceLevel(Number(e.target.value))}
                className="w-full sm:w-auto rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-semibold text-[--color-ink-900] focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                {[0.9, 0.95, 0.98, 0.99].map((s) => (
                  <option key={s} value={s}>
                    {(s * 100).toFixed(0)}% Fleet Availability
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={run}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-98 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Play size={12} className="fill-white" />
              <span>{loading ? "Calculating..." : "Run PuLP Optimizer"}</span>
            </button>
          </div>
        </div>

        {/* RESULTS SECTION */}
        <div>
          {loading ? (
            <LoadingState
              label="Solving linear program optimization…"
              description="PuLP is balancing inventory deficits against budget limits and service level objectives…"
            />
          ) : error ? (
            <ErrorState
              title="Optimization Service Unavailable"
              message={error}
              onRetry={run}
            />
          ) : !result ? (
            <EmptyState
              title="No optimization run executed yet"
              message="Set your procurement budget and target fleet availability level, then click Run PuLP Optimizer."
              icon={Calculator}
              action={{
                label: "Run PuLP Optimizer",
                onClick: run,
                icon: Play,
              }}
            />
          ) : result.items.length === 0 ? (
            <EmptyState
              title="No active procurement recommendations"
              message="Current depot inventory levels satisfy safety stock constraints and forecasted demand within the selected planning horizon. No purchase orders are required."
              icon={Boxes}
              action={{
                label: "Review Central Inventory",
                onClick: () => navigate("/inventory"),
              }}
            />
          ) : (
            <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[--color-border] px-4 py-3 bg-[--color-surface-1]">
                <div className="flex flex-wrap gap-4 sm:gap-6 text-xs">
                  <div>
                    <p className="text-[10px] text-[--color-ink-500] uppercase font-semibold">Allocated Budget</p>
                    <p className="tabular text-sm font-bold text-[--color-ink-900]">
                      {result.budget > 0 ? formatLakhs(result.budget) : "Unconstrained"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[--color-ink-500] uppercase font-semibold">Recommended Spend</p>
                    <p className="tabular text-sm font-bold text-purple-700 dark:text-purple-300">
                      {formatLakhs(result.recommended_spend)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[--color-ink-500] uppercase font-semibold">Remaining Balance</p>
                    <p className="tabular text-sm font-bold text-[--color-ink-700]">
                      {result.budget > 0 ? formatLakhs(result.remaining_budget) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[--color-ink-500] uppercase font-semibold">Items Recommended</p>
                    <p className="text-sm font-bold text-[--color-ink-900]">
                      {result.items.length} line items
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={createPO}
                  disabled={selected.size === 0}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-98 px-4 py-2 text-xs font-semibold text-white shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer w-full sm:w-auto"
                >
                  <CheckSquare size={14} />
                  <span>Create Purchase Order ({selected.size} items)</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[--color-border] bg-[--color-surface-1]/50 text-left text-[11px] font-semibold uppercase tracking-wider text-[--color-ink-500]">
                      <th className="w-8 px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.size === result.items.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelected(new Set(result.items.map((_, i) => i)));
                            } else {
                              setSelected(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="px-2 py-2.5">Recommended Part / Item</th>
                      <th className="px-2 py-2.5 text-right">Optimal Qty</th>
                      <th className="px-2 py-2.5 text-right">Unit Price</th>
                      <th className="px-2 py-2.5 text-right">Total Cost</th>
                      <th className="px-2 py-2.5">Recommended Vendor</th>
                      <th className="px-2 py-2.5 text-center">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--color-border]">
                    {result.items.map((item, i) => (
                      <tr
                        key={item.part}
                        className={`hover:bg-[--color-surface-1]/60 transition-colors ${
                          selected.has(i) ? "" : "opacity-50"
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(i)}
                            onChange={() =>
                              setSelected((s) => {
                                const next = new Set(s);
                                next.has(i) ? next.delete(i) : next.add(i);
                                return next;
                              })
                            }
                          />
                        </td>
                        <td className="px-2 py-2.5 font-semibold text-[--color-ink-900]">{item.part}</td>
                        <td className="tabular px-2 py-2.5 text-right font-bold text-purple-700 dark:text-purple-300">
                          {item.quantity.toLocaleString("en-IN")}
                        </td>
                        <td className="tabular px-2 py-2.5 text-right text-[--color-ink-700]">
                          ₹{item.unit_price.toLocaleString("en-IN")}
                        </td>
                        <td className="tabular px-2 py-2.5 text-right font-bold text-[--color-ink-900]">
                          ₹{item.total_cost.toLocaleString("en-IN")}
                        </td>
                        <td className="px-2 py-2.5 text-[--color-ink-700] truncate max-w-xs">{item.supplier}</td>
                        <td className="px-2 py-2.5 text-center">
                          <StatusBadge label={item.priority} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
