import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Boxes,
  AlertTriangle,
  ClipboardList,
  Wallet,
  Calculator,
  ArrowRight,
  ShieldAlert,
  Package,
  Play,
  CheckCircle2,
} from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { KpiCard } from "../components/ui/KpiCard";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";
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
  const { openAlertModal, totalAlerts } = useAlerts();
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
            fcData = await getForecast({
              part: firstPart,
              start_date: filters.startDate,
              end_date: filters.endDate,
              horizon: filters.horizon,
            });
          } catch {
            fcData = null;
          }

          let pulpData: ProcurementResult | null = null;
          try {
            pulpData = await runOptimization({
              budget: 0,
              forecast_horizon: filters.horizon,
              service_level: 0.95,
            });
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
      .catch(() => setError("Could not load operational dashboard metrics from the central backend."))
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
      <TopBar
        title="Supply Chain Control Tower"
        subtitle="Central operational monitoring across fleet inventory, purchase orders, demand forecasts, and procurement optimization"
      />

      <div className="p-4 sm:p-6 space-y-5">
        {loading ? (
          <LoadingState
            label="Aggregating operational supply chain metrics…"
            description="Syncing inventory balances, purchase order statuses, and optimization constraints."
          />
        ) : error || !kpis ? (
          <ErrorState
            title="Operational Control Tower Unavailable"
            message={error ?? "Could not connect to central logistics services."}
            onRetry={loadData}
          />
        ) : (
          <>
            {/* KPI METRICS ROW */}
            <div className="grid grid-cols-1 gap-3 sm:gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                label="Forecast Demand"
                value={kpis.forecastDemand.toLocaleString("en-IN")}
                unit="units"
                accent="forecast"
                icon={TrendingUp}
                helpText={`${filters.horizon}-month planning window`}
              />
              <KpiCard
                label="Central Inventory"
                value={kpis.currentInventory.toLocaleString("en-IN")}
                unit="units"
                accent="neutral"
                icon={Boxes}
                helpText="Active depot spare stock"
              />
              <KpiCard
                label="Stockout Risks"
                value={String(kpis.stockoutRiskCount)}
                unit="items"
                accent="critical"
                icon={AlertTriangle}
                helpText="Items below safety stock"
                onClick={openAlertModal}
              />
              <KpiCard
                label="Active POs"
                value={String(kpis.openPurchaseOrders)}
                unit="orders"
                accent="neutral"
                icon={ClipboardList}
                helpText="Orders pending delivery"
              />
              <KpiCard
                label="Allocated Budget"
                value={formatCurrency(kpis.procurementBudget)}
                accent="optimize"
                icon={Wallet}
                helpText="Current procurement pool"
              />
              <KpiCard
                label="Recommended Spend"
                value={formatCurrency(kpis.recommendedProcurement)}
                accent="optimize"
                icon={Calculator}
                helpText="PuLP optimization output"
              />
            </div>

            {/* OPERATIONAL PANELS GRID */}
            <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
              {/* 1. INVENTORY RISK PANEL */}
              <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-4 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[--color-border] pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="text-rose-600 dark:text-rose-400" size={16} />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[--color-ink-900]">
                        Inventory Critical Stock & Reorder Triggers
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {totalAlerts > 0 && (
                        <button
                          onClick={openAlertModal}
                          className="flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        >
                          <AlertTriangle size={11} /> Review Alerts ({totalAlerts})
                        </button>
                      )}
                      <button
                        onClick={() => navigate("/inventory")}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Inventory Table <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    {criticalInventory.length === 0 ? (
                      <EmptyState
                        title="All Inventory Stock Normal"
                        message="No spare parts are currently below safety stock thresholds or in critical stockout status."
                        icon={CheckCircle2}
                      />
                    ) : (
                      <table className="w-full text-xs min-w-[420px]">
                        <thead>
                          <tr className="border-b border-[--color-border] bg-[--color-surface-1]/50 text-left text-[11px] font-semibold uppercase tracking-wider text-[--color-ink-500]">
                            <th className="py-2 px-2.5">Part / Item</th>
                            <th className="py-2 px-2 text-right">Current Stock</th>
                            <th className="py-2 px-2 text-right">Safety Stock</th>
                            <th className="py-2 px-2 text-right">Reorder Point</th>
                            <th className="py-2 px-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[--color-border]">
                          {criticalInventory.map((item, idx) => (
                            <tr
                              key={`dash-crit-${item.id}-${idx}`}
                              className="hover:bg-[--color-surface-1]/60 transition-colors"
                            >
                              <td className="py-2.5 px-2.5 font-medium text-[--color-ink-900] truncate max-w-[180px]">
                                {item.part}
                              </td>
                              <td className="py-2.5 px-2 tabular text-right font-bold text-rose-600 dark:text-rose-400">
                                {item.currentStock.toLocaleString("en-IN")}
                              </td>
                              <td className="py-2.5 px-2 tabular text-right text-[--color-ink-600]">
                                {item.safetyStock.toLocaleString("en-IN")}
                              </td>
                              <td className="py-2.5 px-2 tabular text-right text-[--color-ink-600]">
                                {item.reorderPoint.toLocaleString("en-IN")}
                              </td>
                              <td className="py-2.5 px-2 text-center">
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

              {/* 2. RECENT PURCHASE ORDERS PANEL */}
              <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-4 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[--color-border] pb-3">
                    <div className="flex items-center gap-2">
                      <Package className="text-blue-600 dark:text-blue-400" size={16} />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[--color-ink-900]">
                        Purchase Order Transactions
                      </h2>
                    </div>
                    <button
                      onClick={() => navigate("/purchase-orders")}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      All Purchase Orders <ArrowRight size={12} />
                    </button>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    {recentPos.length === 0 ? (
                      <EmptyState
                        title="No Purchase Orders Recorded"
                        message="No purchase orders are currently registered in the database."
                        action={{
                          label: "Create Purchase Order",
                          onClick: () => navigate("/purchase-orders/new"),
                        }}
                      />
                    ) : (
                      <table className="w-full text-xs min-w-[360px]">
                        <thead>
                          <tr className="border-b border-[--color-border] bg-[--color-surface-1]/50 text-left text-[11px] font-semibold uppercase tracking-wider text-[--color-ink-500]">
                            <th className="py-2 px-2.5">PO Number</th>
                            <th className="py-2 px-2">Supplier</th>
                            <th className="py-2 px-2 text-right">Order Value</th>
                            <th className="py-2 px-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[--color-border]">
                          {recentPos.map((po, idx) => (
                            <tr
                              key={`dash-po-${po.poNumber}-${idx}`}
                              onClick={() => navigate("/purchase-orders")}
                              className="hover:bg-[--color-surface-1]/60 transition-colors cursor-pointer"
                            >
                              <td className="py-2.5 px-2.5 font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                {po.poNumber}
                              </td>
                              <td className="py-2.5 px-2 text-[--color-ink-700] truncate max-w-[150px]">
                                {po.supplier}
                              </td>
                              <td className="py-2.5 px-2 tabular text-right font-medium text-[--color-ink-900]">
                                ₹{po.total.toLocaleString("en-IN")}
                              </td>
                              <td className="py-2.5 px-2 text-center">
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

              {/* 3. DEMAND FORECAST OVERVIEW */}
              <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[--color-border] pb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="text-blue-600 dark:text-blue-400" size={16} />
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[--color-ink-900]">
                          Demand Forecasting Engine
                        </h2>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("/forecast")}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Open Forecasting <ArrowRight size={12} />
                    </button>
                  </div>

                  {latestForecast ? (
                    <div className="mt-3.5 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                        <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2">
                          <p className="text-[10px] font-semibold uppercase text-[--color-ink-500]">Model</p>
                          <p className="font-bold text-[--color-ink-900] truncate mt-0.5">{latestForecast.modelName}</p>
                        </div>
                        <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2">
                          <p className="text-[10px] font-semibold uppercase text-[--color-ink-500]">MAPE Error</p>
                          <p className="font-bold text-[--color-ink-900] mt-0.5">{latestForecast.mape}%</p>
                        </div>
                        <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2">
                          <p className="text-[10px] font-semibold uppercase text-[--color-ink-500]">MAE</p>
                          <p className="font-bold text-[--color-ink-900] mt-0.5">{latestForecast.mae}</p>
                        </div>
                        <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2">
                          <p className="text-[10px] font-semibold uppercase text-[--color-ink-500]">RMSE</p>
                          <p className="font-bold text-[--color-ink-900] mt-0.5">{latestForecast.rmse}</p>
                        </div>
                      </div>
                      <p className="text-xs text-[--color-ink-600] leading-relaxed">
                        External machine learning model predicts fleet spare requirements for the next{" "}
                        <span className="font-semibold text-[--color-ink-900]">{latestForecast.horizon} months</span> using consumption history and confidence intervals.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <EmptyState
                        title="No Forecast Generated"
                        message="Select an inventory item in Demand Forecasting to generate ML component projections."
                        action={{
                          label: "Run Demand Forecast",
                          onClick: () => navigate("/forecast"),
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 4. PROCUREMENT OPTIMIZATION OVERVIEW */}
              <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-4 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[--color-border] pb-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="text-purple-600 dark:text-purple-400" size={16} />
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[--color-ink-900]">
                          PuLP Optimization Engine
                        </h2>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("/procurement")}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Open Optimizer <ArrowRight size={12} />
                    </button>
                  </div>

                  {pulpResult ? (
                    <div className="mt-3.5 space-y-3 text-xs">
                      <div className="flex justify-between items-center rounded border border-[--color-border] bg-[--color-surface-1] p-3">
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-[--color-ink-500]">Recommended Spend</p>
                          <p className="text-base font-bold tabular text-purple-700 dark:text-purple-300">
                            ₹{pulpResult.recommended_spend.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-semibold text-[--color-ink-500]">Recommended Spares</p>
                          <p className="text-base font-bold text-[--color-ink-900]">
                            {pulpResult.items.length} line items
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCreatePoFromPulp}
                        className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-98 py-2 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer"
                      >
                        <Play size={12} className="fill-white" />
                        <span>Create Purchase Order from Recommendations</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <EmptyState
                        title="No Active Procurement Recommendations"
                        message="Execute the PuLP mathematical solver to optimize purchase quantities within budget limits."
                        action={{
                          label: "Calculate Recommendations",
                          onClick: () => navigate("/procurement"),
                        }}
                      />
                    </div>
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
