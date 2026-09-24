import { useNavigate } from "react-router-dom";
import { AlertCircle, X, ShoppingCart, ArrowRight, ExternalLink } from "lucide-react";
import { useAlerts } from "../../state/AlertsContext";
import { StatusBadge } from "./StatusBadge";

export function LowStockAlertModal() {
  const { isAlertModalOpen, closeAlertModal, lowStockItems, criticalItems, warningItems } = useAlerts();
  const navigate = useNavigate();

  if (!isAlertModalOpen) return null;

  const handleCreatePo = () => {
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
    navigate("/purchase-orders/new", { state: { items } });
  };

  const handleGoToInventory = () => {
    closeAlertModal();
    navigate("/inventory");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4"
      onClick={closeAlertModal}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-[--color-border] bg-[--color-surface-0] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-[--color-border] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertCircle size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-[--color-ink-900]">Low Stock Alert</h2>
                <span className="rounded-md bg-[--color-surface-2] border border-[--color-border] px-2 py-0.5 text-[11px] font-medium text-[--color-ink-700]">
                  {lowStockItems.length} items
                </span>
              </div>
              <p className="text-xs text-[--color-ink-500]">
                Spare parts below safety stock or reorder point requiring attention
              </p>
            </div>
          </div>
          <button
            onClick={closeAlertModal}
            className="rounded-md p-1.5 text-[--color-ink-500] hover:bg-[--color-surface-2] hover:text-[--color-ink-900] transition-colors cursor-pointer"
            aria-label="Close alert"
          >
            <X size={16} />
          </button>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-3 gap-3 border-b border-[--color-border] bg-[--color-surface-1] px-5 py-3 text-xs">
          <div className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-2.5">
            <p className="text-[10px] uppercase font-semibold text-[--color-ink-500]">Total Low Stock</p>
            <p className="text-base font-bold text-[--color-ink-900] mt-0.5">{lowStockItems.length}</p>
          </div>
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5">
            <p className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400">Critical Risk</p>
            <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">{criticalItems.length}</p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
            <p className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">Reorder Threshold</p>
            <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">{warningItems.length}</p>
          </div>
        </div>

        {/* ITEMS LIST */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {lowStockItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[--color-ink-500]">
              <p className="font-semibold text-sm text-[--color-healthy-600]">All Inventory Healthy</p>
              <p className="mt-1">No items currently below safety stock or reorder thresholds.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[--color-border]">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left uppercase text-[11px] font-semibold text-[--color-ink-500]">
                    <th className="py-2.5 px-3">Part / Component</th>
                    <th className="py-2.5 px-3">Current Stock</th>
                    <th className="py-2.5 px-3">Safety Stock</th>
                    <th className="py-2.5 px-3">Reorder Point</th>
                    <th className="py-2.5 px-3">Supply Left</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-1] transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-[--color-ink-900]">{item.part}</p>
                        <p className="text-[11px] text-[--color-ink-400]">{item.category}</p>
                      </td>
                      <td className="py-2.5 px-3 tabular font-semibold text-rose-600 dark:text-rose-400">
                        {item.currentStock} units
                      </td>
                      <td className="py-2.5 px-3 tabular text-[--color-ink-500]">{item.safetyStock} units</td>
                      <td className="py-2.5 px-3 tabular text-[--color-ink-500]">{item.reorderPoint} units</td>
                      <td className="py-2.5 px-3 tabular text-[--color-ink-700]">
                        {item.daysOfSupply} days
                      </td>
                      <td className="py-2.5 px-3">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[--color-border] bg-[--color-surface-1] px-5 py-3 text-xs">
          <button
            onClick={handleGoToInventory}
            className="flex items-center gap-1.5 text-[--color-ink-700] hover:text-[--color-ink-900] font-medium transition-colors cursor-pointer"
          >
            <span>View Full Inventory</span>
            <ExternalLink size={13} className="text-[--color-ink-400]" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={closeAlertModal}
              className="rounded-lg border border-[--color-border] bg-[--color-surface-0] px-3.5 py-1.5 text-xs font-medium text-[--color-ink-700] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleCreatePo}
              className="flex items-center gap-1.5 rounded-lg bg-[--color-ink-900] text-[--color-surface-0] px-4 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
            >
              <ShoppingCart size={13} />
              <span>Create Purchase Order</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
