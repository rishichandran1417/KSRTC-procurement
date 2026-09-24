import { useNavigate } from "react-router-dom";
import { AlertCircle, X, ShoppingCart, ArrowRight, ExternalLink, Zap } from "lucide-react";
import { useAlerts } from "../../state/AlertsContext";
import { StatusBadge } from "./StatusBadge";

export function LowStockAlertModal() {
  const { isAlertModalOpen, closeAlertModal, lowStockItems, criticalItems, warningItems } = useAlerts();
  const navigate = useNavigate();

  if (!isAlertModalOpen) return null;

  const handleCriticalBuy = () => {
    closeAlertModal();
    const targetItems = criticalItems.length > 0 ? criticalItems : lowStockItems;
    const items = targetItems.map((item) => {
      const neededQty = Math.max(item.reorderPoint * 2 - item.currentStock, 1);
      const unitPrice = item.unitCost || 0;
      return {
        part: item.part,
        quantity: neededQty,
        unit_price: unitPrice,
        total_cost: neededQty * unitPrice,
        supplier: item.primarySupplier || "KSRTC Central Stores / Urgent Vendor",
        priority: "High" as const,
      };
    });
    navigate("/purchase-orders/new", {
      state: {
        items,
        source: "critical",
        isCritical: true,
        notes: "Emergency Critical Stockout Procurement (Critical Buy)",
      },
    });
  };

  const handleOrderAllLowStock = () => {
    closeAlertModal();
    const items = lowStockItems.map((item) => {
      const neededQty = Math.max(item.reorderPoint * 2 - item.currentStock, 1);
      const unitPrice = item.unitCost || 0;
      return {
        part: item.part,
        quantity: neededQty,
        unit_price: unitPrice,
        total_cost: neededQty * unitPrice,
        supplier: item.primarySupplier || "",
        priority: (item.status === "Critical" ? "High" : "Medium") as "High" | "Medium" | "Low",
      };
    });
    navigate("/purchase-orders/new", {
      state: {
        items,
        source: "low_stock",
        notes: "Pre-populated from Low Stock Alert Reorder",
      },
    });
  };

  const handleGoToInventory = () => {
    closeAlertModal();
    navigate("/inventory");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4"
      onClick={closeAlertModal}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
        style={{ backgroundColor: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
              <AlertCircle size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-zinc-50">Low Stock Alert</h2>
                <span className="rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  {lowStockItems.length} items
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Spare parts below safety stock or reorder point requiring depot action
              </p>
            </div>
          </div>
          <button
            onClick={closeAlertModal}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Close alert"
          >
            <X size={18} />
          </button>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-3 gap-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-5 py-3.5 text-xs">
          <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-2xs">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-zinc-400">Total Low Stock</p>
            <p className="text-lg font-bold text-slate-900 dark:text-zinc-50 mt-0.5">{lowStockItems.length}</p>
          </div>
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-3 shadow-2xs">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-rose-600 dark:text-rose-400">Critical Risk</p>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">{criticalItems.length}</p>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-3 shadow-2xs">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-amber-600 dark:text-amber-400">Reorder Threshold</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">{warningItems.length}</p>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-white dark:bg-zinc-900">
          {lowStockItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <p className="font-semibold text-sm text-emerald-600">All Inventory Healthy</p>
              <p className="mt-1">No items currently below safety stock or reorder thresholds.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
              <table className="w-full text-xs min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-left uppercase text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                    <th className="py-3 px-3.5">Part / Component</th>
                    <th className="py-3 px-3.5">Current Stock</th>
                    <th className="py-3 px-3.5">Safety Stock</th>
                    <th className="py-3 px-3.5">Reorder Point</th>
                    <th className="py-3 px-3.5">Supply Left</th>
                    <th className="py-3 px-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                  {lowStockItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3 px-3.5">
                        <p className="font-semibold text-slate-900 dark:text-zinc-100">{item.part}</p>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500">{item.category}</p>
                      </td>
                      <td className="py-3 px-3.5 tabular font-bold text-rose-600 dark:text-rose-400">
                        {item.currentStock} units
                      </td>
                      <td className="py-3 px-3.5 tabular text-slate-600 dark:text-zinc-400">{item.safetyStock} units</td>
                      <td className="py-3 px-3.5 tabular text-slate-600 dark:text-zinc-400">{item.reorderPoint} units</td>
                      <td className="py-3 px-3.5 tabular text-slate-700 dark:text-zinc-300 font-medium">
                        {item.daysOfSupply} days
                      </td>
                      <td className="py-3 px-3.5">
                        <StatusBadge label={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-5 py-3.5 text-xs">
          <button
            onClick={handleGoToInventory}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium transition-colors cursor-pointer"
          >
            <span>View Full Inventory Table</span>
            <ExternalLink size={13} className="text-slate-400" />
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={closeAlertModal}
              className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs"
            >
              Close
            </button>
            <button
              onClick={handleCriticalBuy}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 active:scale-95 px-4 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Zap size={14} className="fill-white" />
              <span>⚡ Critical Buy ({criticalItems.length > 0 ? criticalItems.length : lowStockItems.length})</span>
            </button>
            <button
              onClick={handleOrderAllLowStock}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <ShoppingCart size={13} />
              <span>Order All Low Stock ({lowStockItems.length})</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
