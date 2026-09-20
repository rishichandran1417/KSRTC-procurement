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
          const fcData = await getForecast({ part: firstPart, start_date: filters.startDate, end_date: filters.endDate, horizon: filters.horizon });
          const pulpData = await runOptimization({ budget: 600000, forecast_horizon: filters.horizon, service_level: 0.95 });
          setLatestForecast(fcData.series.length > 0 ? fcData : null);
          setPulpResult(pulpData.items.length > 0 ? pulpData : null);
        } else {
          setLatestForecast(null);
          setPulpResult(null);
        }
      })
      .catch(() => setError("Could not load operational dashboard data."))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, [filters.category, filters.startDate, filters.endDate, filters.horizon]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreatePoFromPulp = () => {
    if (!pulpResult) return;
    navigate("/purchase-orders/new", { state: { items: pulpResult.items } });
  };

  return (
    <div>
      <TopBar title="Operational Dashboard" subtitle="Real-time overview of depot operations" />

      <div className="p-6 space-y-6">
        {loading ? (
          <LoadingState label="Loading operational metrics…" />
        ) : error || !kpis ? (
          <ErrorState title="Dashboard unavailable." message={error ?? undefined} onRetry={loadData} />
        ) : (
          <>
            {/* KPI ROW */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                label="Forecast Demand"
                value={kpis.forecastDemand.toLocaleString("en-IN")}
                unit="units"
                accent="forecast"
                icon={TrendingUp}
                helpText={`Next ${filters.horizon} months`}
              />
              <KpiCard
                label="Current Inventory"
                value={kpis.currentInventory.toLocaleString("en-IN")}
                unit="units"
                accent="neutral"
                icon={Boxes}
              />
              <KpiCard
                label="Stockout Risk"
                value={String(kpis.stockoutRiskCount)}
                unit="items"
                accent="critical"
                icon={AlertTriangle}
              />
              <KpiCard
                label="Open POs"
                value={String(kpis.openPurchaseOrders)}
                accent="neutral"
                icon={ClipboardList}
              />
              <KpiCard
                label="Procurement Budget"
                value={formatCurrency(kpis.procurementBudget)}
                accent="optimize"
                icon={Wallet}
              />
              <KpiCard
                label="Recommended Procurement"
                value={formatCurrency(kpis.recommendedProcurement)}
                accent="optimize"
                icon={Calculator}
              />
            </div>

            {/* OPERATIONAL PANELS GRID */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              
              {/* 1. INVENTORY RISK */}
              <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[--color-border] pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="text-[--color-critical-500]" size={18} />
                      <h2 className="text-sm font-semibold text-[--color-ink-900]">Inventory Risk — Action Required</h2>
                    </div>
                    <button
                      onClick={() => navigate("/inventory")}
                      className="flex items-center gap-1 text-xs font-medium text-[--color-forecast-600] hover:underline"
                    >
                      View All Inventory <ArrowRight size={12} />
                    </button>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    {criticalInventory.length === 0 ? (
                      <p className="py-6 text-center text-xs text-[--color-ink-500]">
                        No stockout risk items detected. All inventory healthy.
                      </p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[--color-border] text-left uppercase tracking-wider text-[--color-ink-500]">
                            <th className="py-2 pr-2">Part</th>
                            <th className="py-2 px-2">Stock</th>
                            <th className="py-2 px-2">Safety Stock</th>
                            <th className="py-2 px-2">Reorder Point</th>
                            <th className="py-2 px-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {criticalInventory.map((item) => (
                            <tr key={item.id} className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-1]">
                              <td className="py-2 pr-2 font-medium text-[--color-ink-900]">{item.part}</td>
                              <td className="py-2 px-2 tabular font-semibold">{item.currentStock}</td>
                              <td className="py-2 px-2 tabular text-[--color-ink-500]">{item.safetyStock}</td>
                              <td className="py-2 px-2 tabular text-[--color-ink-500]">{item.reorderPoint}</td>
                              <td className="py-2 px-2">
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

              {/* 2. RECENT PURCHASE ORDERS */}
              <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[--color-border] pb-3">
                    <div className="flex items-center gap-2">
                      <Package className="text-[--color-forecast-600]" size={18} />
                      <h2 className="text-sm font-semibold text-[--color-ink-900]">Recent Purchase Orders</h2>
                    </div>
                    <button
                      onClick={() => navigate("/purchase-orders")}
                      className="flex items-center gap-1 text-xs font-medium text-[--color-forecast-600] hover:underline"
                    >
                      View All POs <ArrowRight size={12} />
                    </button>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    {recentPos.length === 0 ? (
                      <p className="py-6 text-center text-xs text-[--color-ink-500]">
                        No purchase orders placed yet.
                      </p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[--color-border] text-left uppercase tracking-wider text-[--color-ink-500]">
                            <th className="py-2 pr-2">PO #</th>
                            <th className="py-2 px-2">Supplier</th>
                            <th className="py-2 px-2">Total</th>
                            <th className="py-2 px-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentPos.map((po) => (
                            <tr key={po.poNumber} className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-1]">
                              <td className="py-2 pr-2 font-medium text-[--color-ink-900]">{po.poNumber}</td>
                              <td className="py-2 px-2 text-[--color-ink-700]">{po.supplier}</td>
                              <td className="py-2 px-2 tabular font-medium">₹{po.total.toLocaleString("en-IN")}</td>
                              <td className="py-2 px-2">
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
              <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-4">
                <div className="flex items-center justify-between border-b border-[--color-border] pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-[--color-forecast-500]" size={18} />
                    <div>
                      <h2 className="text-sm font-semibold text-[--color-ink-900]">ML Demand Forecast Summary</h2>
                      <p className="text-[11px] text-[--color-ink-500]">Forecast generated by ML model</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/forecast")}
                    className="flex items-center gap-1 text-xs font-medium text-[--color-forecast-600] hover:underline"
                  >
                    Open Forecast Model <ArrowRight size={12} />
                  </button>
                </div>

                {latestForecast ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2">
                        <p className="text-[10px] text-[--color-ink-500]">MODEL</p>
                        <p className="font-semibold text-[--color-ink-900] truncate">{latestForecast.modelName}</p>
                      </div>
                      <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2">
                        <p className="text-[10px] text-[--color-ink-500]">MAPE</p>
                        <p className="font-semibold text-[--color-ink-900]">{latestForecast.mape}%</p>
                      </div>
                      <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2">
                        <p className="text-[10px] text-[--color-ink-500]">MAE</p>
                        <p className="font-semibold text-[--color-ink-900]">{latestForecast.mae}</p>
                      </div>
                      <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2">
                        <p className="text-[10px] text-[--color-ink-500]">RMSE</p>
                        <p className="font-semibold text-[--color-ink-900]">{latestForecast.rmse}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[--color-ink-600]">
                      ML model projects demand for key components across the next {latestForecast.horizon} months with standard confidence interval.
                    </p>
                  </div>
                ) : (
                  <p className="py-6 text-center text-xs text-[--color-ink-500]">
                    No forecast generated. Add items to inventory to request ML demand forecasts.
                  </p>
                )}
              </div>

              {/* 4. PROCUREMENT OVERVIEW */}
              <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[--color-border] pb-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="text-[--color-optimize-500]" size={18} />
                      <div>
                        <h2 className="text-sm font-semibold text-[--color-ink-900]">PuLP Procurement Optimization</h2>
                        <p className="text-[11px] text-[--color-ink-500]">Recommendations generated by PuLP model</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("/procurement")}
                      className="flex items-center gap-1 text-xs font-medium text-[--color-forecast-600] hover:underline"
                    >
                      Open Optimizer <ArrowRight size={12} />
                    </button>
                  </div>

                  {pulpResult ? (
                    <div className="mt-4 space-y-3 text-xs">
                      <div className="flex justify-between items-center rounded border border-[--color-border] bg-[--color-surface-1] p-3">
                        <div>
                          <p className="text-[10px] uppercase text-[--color-ink-500]">Recommended Spend</p>
                          <p className="text-base font-bold text-[--color-optimize-700]">₹{pulpResult.recommended_spend.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase text-[--color-ink-500]">Items Recommended</p>
                          <p className="text-base font-bold text-[--color-ink-900]">{pulpResult.items.length} line items</p>
                        </div>
                      </div>

                      <button
                        onClick={handleCreatePoFromPulp}
                        className="w-full flex items-center justify-center gap-2 rounded bg-[--color-forecast-500] py-2 text-xs font-medium text-white hover:bg-[--color-forecast-700]"
                      >
                        <Play size={12} /> Create Purchase Order from Recommendation
                      </button>
                    </div>
                  ) : (
                    <p className="py-6 text-center text-xs text-[--color-ink-500]">
                      No active procurement recommendations. Click Open Optimizer to calculate recommendations.
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
