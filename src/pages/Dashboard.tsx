import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Boxes, AlertTriangle, ClipboardList, Wallet, Calculator,
  ArrowRight, ShieldAlert, Package, Play
} from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { KpiCard } from "../components/ui/KpiCard";
import { LoadingState, ErrorState } from "../components/ui/States";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useFilters } from "../state/FiltersContext";
import { useAlerts } from "../state/AlertsContext";
import { getDashboardKpis } from "../services/dashboardApi";
import { getInventory } from "../services/inventoryApi";
import { getPurchaseOrders } from "../services/purchaseOrderApi";
import { getForecast } from "../services/forecastApi";
import { runOptimization } from "../services/procurementApi";
import type { DashboardKpis, InventoryItem, PurchaseOrder, ForecastResult, ProcurementResult } from "../types";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function Dashboard() {
  const { filters } = useFilters();
  const { openAlertModal } = useAlerts();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [criticalInventory, setCriticalInventory] = useState<InventoryItem[]>([]);
  const [recentPos, setRecentPos] = useState<PurchaseOrder[]>([]);
  const [latestForecast, setLatestForecast] = useState<ForecastResult | null>(null);
  const [pulpResult, setPulpResult] = useState<ProcurementResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    getInventory()
      .then(async (invData) => {
        const poData = await getPurchaseOrders();
        const kpiData = await getDashboardKpis(filters);

        setKpis(kpiData);
        setCriticalInventory(invData.filter((i) => i.status !== "Healthy").slice(0, 5));
        setRecentPos(poData.slice(0, 5));

        if (invData.length > 0) {
          const firstPart = invData[0].part;
          let fcData: ForecastResult | null = null;
          try {
            fcData = await getForecast({ part: firstPart, start_date: filters.startDate, end_date: filters.endDate, horizon: filters.horizon });
          } catch {
            fcData = null;
          }

          let pulpData: ProcurementResult | null = null;
          try {
            pulpData = await runOptimization({ budget: 0, forecast_horizon: filters.horizon, service_level: 0.95 });
          } catch {
            pulpData = null;
          }

          setLatestForecast(fcData && fcData.series && fcData.series.length > 0 ? fcData : null);
          setPulpResult(pulpData && pulpData.items && pulpData.items.length > 0 ? pulpData : null);
        } else {
          setLatestForecast(null);
          setPulpResult(null);
        }
      })
      .catch(() => setError("Could not load operational dashboard data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const handleInvChange = () => loadData();
    window.addEventListener("ksrtc_inventory_changed", handleInvChange);
    return () => window.removeEventListener("ksrtc_inventory_changed", handleInvChange);
  }, [filters.category, filters.startDate, filters.endDate, filters.horizon]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreatePoFromPulp = () => {
    if (!pulpResult) return;
    navigate("/purchase-orders/new", {
      state: {
        items: pulpResult.items,
        source: "pulp",
        notes: "Pre-populated from PuLP Optimization Model Recommendation",
      },
    });
  };

  return (
    <div>
      <TopBar title="Operational Dashboard" subtitle="Real-time overview of depot inventory, demand forecast, and procurement pipeline" />

      <div className="p-4 sm:p-6 space-y-5">
        {loading ? (
          <LoadingState label="Loading operational metrics…" />
        ) : error || !kpis ? (
          <ErrorState title="Dashboard unavailable." message={error ?? undefined} onRetry={loadData} />
        ) : (
          <>
            {/* KPI ROW */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                label="Forecast Demand"
                value={kpis.forecastDemand.toLocaleString("en-IN")}
                unit="units"
                accent="forecast"
                icon={TrendingUp}
                helpText={`Next ${filters.horizon} months`}
              />
              <KpiCard
                label="Current Stock"
                value={kpis.currentInventory.toLocaleString("en-IN")}
                unit="units"
                accent="neutral"
                icon={Boxes}
                helpText="Active central inventory"
              />
              <KpiCard
                label="Stockout Risk"
                value={String(kpis.stockoutRiskCount)}
                unit="items"
                accent={kpis.stockoutRiskCount > 0 ? "critical" : "healthy"}
                icon={AlertTriangle}
                helpText={kpis.stockoutRiskCount > 0 ? "Items below safety stock" : "All levels nominal"}
                onClick={openAlertModal}
              />
              <KpiCard
                label="Open Orders"
                value={String(kpis.openPurchaseOrders)}
                unit="POs"
                accent="neutral"
                icon={ClipboardList}
                helpText="In-flight supplier POs"
              />
              <KpiCard
                label="Procurement Budget"
                value={formatCurrency(kpis.procurementBudget)}
                accent="optimize"
                icon={Wallet}
                helpText="Allocated depot budget"
              />
              <KpiCard
                label="Recommended Spend"
                value={formatCurrency(kpis.recommendedProcurement)}
                accent="optimize"
                icon={Calculator}
                helpText="PuLP model requirement"
              />
            </div>

            {/* OPERATIONAL PANELS GRID */}
            <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">

              {/* 1. INVENTORY RISK TABLE */}
              <div className="rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800 px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldAlert className="text-rose-600 dark:text-rose-400 shrink-0" size={16} />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 truncate">
                        Critical Shortages & Reorder Due
                      </h2>
                    </div>
                    <button
                      onClick={() => navigate("/inventory")}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                    >
                      View All <ArrowRight size={12} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    {criticalInventory.length === 0 ? (
                      <p className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
                        No critical stockout items detected. All inventory levels are nominal.
                      </p>
                    ) : (
                      <table className="w-full text-xs min-w-[420px]">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/75 dark:bg-zinc-850 text-left text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                            <th className="py-2.5 px-3.5">Part / Item</th>
                            <th className="py-2.5 px-2.5 text-right">Stock</th>
                            <th className="py-2.5 px-2.5 text-right">Safety</th>
                            <th className="py-2.5 px-2.5 text-right">Reorder</th>
                            <th className="py-2.5 px-3.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                          {criticalInventory.map((item, idx) => (
                            <tr key={`dash-crit-${item.id}-${idx}`} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                              <td className="py-2.5 px-3.5 font-medium text-slate-900 dark:text-zinc-100">{item.part}</td>
                              <td className="py-2.5 px-2.5 text-right tabular font-bold text-rose-600 dark:text-rose-400">{item.currentStock}</td>
                              <td className="py-2.5 px-2.5 text-right tabular text-slate-500 dark:text-zinc-400">{item.safetyStock}</td>
                              <td className="py-2.5 px-2.5 text-right tabular text-slate-500 dark:text-zinc-400">{item.reorderPoint}</td>
                              <td className="py-2.5 px-3.5 text-center">
                                <StatusBadge label={item.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. RECENT PURCHASE ORDERS TABLE */}
              <div className="rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800 px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="text-blue-600 dark:text-blue-400 shrink-0" size={16} />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 truncate">
                        Recent Purchase Orders
                      </h2>
                    </div>
                    <button
                      onClick={() => navigate("/purchase-orders")}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                    >
                      View All POs <ArrowRight size={12} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    {recentPos.length === 0 ? (
                      <p className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
                        No purchase orders recorded yet.
                      </p>
                    ) : (
                      <table className="w-full text-xs min-w-[380px]">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/75 dark:bg-zinc-850 text-left text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                            <th className="py-2.5 px-3.5">PO #</th>
                            <th className="py-2.5 px-2.5">Supplier</th>
                            <th className="py-2.5 px-2.5 text-right">Total Amount</th>
                            <th className="py-2.5 px-3.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                          {recentPos.map((po, idx) => (
                            <tr key={`dash-po-${po.poNumber}-${idx}`} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                              <td className="py-2.5 px-3.5 font-medium text-slate-900 dark:text-zinc-100">{po.poNumber}</td>
                              <td className="py-2.5 px-2.5 text-slate-600 dark:text-zinc-300 truncate max-w-[160px]">{po.supplier}</td>
                              <td className="py-2.5 px-2.5 text-right tabular font-semibold text-slate-900 dark:text-zinc-100">₹{po.total.toLocaleString("en-IN")}</td>
                              <td className="py-2.5 px-3.5 text-center">
                                <StatusBadge label={po.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. FORECAST OVERVIEW */}
              <div className="rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-blue-600 dark:text-blue-400 shrink-0" size={16} />
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                        Demand Forecast Status
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">External ML demand forecasting pipeline</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/forecast")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                  >
                    Open Forecast <ArrowRight size={12} />
                  </button>
                </div>

                {latestForecast ? (
                  <div className="mt-3.5 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="rounded border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-850 p-2">
                        <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500">Model</p>
                        <p className="font-semibold text-slate-900 dark:text-zinc-100 truncate mt-0.5">{latestForecast.modelName}</p>
                      </div>
                      <div className="rounded border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-850 p-2">
                        <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500">MAPE</p>
                        <p className="font-semibold text-slate-900 dark:text-zinc-100 tabular mt-0.5">{latestForecast.mape}%</p>
                      </div>
                      <div className="rounded border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-850 p-2">
                        <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500">MAE</p>
                        <p className="font-semibold text-slate-900 dark:text-zinc-100 tabular mt-0.5">{latestForecast.mae}</p>
                      </div>
                      <div className="rounded border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-850 p-2">
                        <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500">Horizon</p>
                        <p className="font-semibold text-slate-900 dark:text-zinc-100 mt-0.5">{latestForecast.horizon} Mo</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400">
                      Demand projections computed for active fleet components across the next {latestForecast.horizon} months with standard confidence interval.
                    </p>
                  </div>
                ) : (
                  <p className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
                    No active forecast generated. Open the Forecast tab to run projections.
                  </p>
                )}
              </div>

              {/* 4. PROCUREMENT OPTIMIZATION OVERVIEW */}
              <div className="rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="text-purple-600 dark:text-purple-400 shrink-0" size={16} />
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                          Procurement Optimization
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400">Mathematical linear optimization model</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("/procurement")}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                    >
                      Open Optimizer <ArrowRight size={12} />
                    </button>
                  </div>

                  {pulpResult ? (
                    <div className="mt-3.5 space-y-3 text-xs">
                      <div className="flex justify-between items-center rounded border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-850 p-3">
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500">Optimized Value</p>
                          <p className="text-base font-bold text-slate-900 dark:text-zinc-100 tabular mt-0.5">₹{pulpResult.recommended_spend.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500">Recommended Lines</p>
                          <p className="text-base font-bold text-slate-900 dark:text-zinc-100 mt-0.5">{pulpResult.items.length} parts</p>
                        </div>
                      </div>

                      <button
                        onClick={handleCreatePoFromPulp}
                        className="w-full flex items-center justify-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
                      >
                        <Play size={12} className="fill-white" />
                        <span>Create Purchase Order from Optimization</span>
                      </button>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
                      No active optimization executed. Configure budget parameters in the Optimizer tab.
                    </p>
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
