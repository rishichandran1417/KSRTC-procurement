import { useNavigate } from "react-router-dom";
import { AlertTriangle, X, ShoppingCart, ArrowRight, Boxes } from "lucide-react";
import { useAlerts } from "../../state/AlertsContext";
import { StatusBadge } from "./StatusBadge";

export function LowStockAlertModal() {
  const { isAlertModalOpen, closeAlertModal, lowStockItems, criticalItems, warningItems } = useAlerts();
  const navigate = useNavigate();

  if (!isAlertModalOpen) return null;

  const handleCreatePo = () => {
    closeAlertModal();
    // Convert low stock items into PO lines
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4"
      onClick={closeAlertModal}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-red-500/30 bg-[#121620] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-[--color-border] bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-600 border border-red-500/30">
              <AlertTriangle size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[--color-ink-900]">Low Stock Alert</h2>
                <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-600 border border-red-500/30">
                  {lowStockItems.length} Items Alert
                </span>
              </div>
              <p className="text-xs text-[--color-ink-500]">
                Critical spare parts below safety stock or reorder point requiring depot action
              </p>
            </div>
          </div>
          <button
            onClick={closeAlertModal}
            className="rounded-lg p-1.5 text-[--color-ink-500] hover:bg-[--color-surface-1] hover:text-[--color-ink-900] transition-colors"
            aria-label="Close alert"
          >
            <X size={18} />
          </button>
        </div>

        {/* METRICS PILLS */}
        <div className="grid grid-cols-3 gap-2 border-b border-[--color-border] bg-[--color-surface-1] p-3 text-center text-xs">
          <div className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-2">
            <p className="text-[10px] uppercase font-bold text-[--color-ink-400]">Total Low Stock</p>
            <p className="text-base font-bold text-[--color-ink-900]">{lowStockItems.length}</p>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2">
            <p className="text-[10px] uppercase font-bold text-red-500">Critical Stockout Risk</p>
            <p className="text-base font-bold text-red-600">{criticalItems.length}</p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
            <p className="text-[10px] uppercase font-bold text-amber-500">Reorder Threshold</p>
            <p className="text-base font-bold text-amber-600">{warningItems.length}</p>
          </div>
        </div>

        {/* ITEMS LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {lowStockItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[--color-ink-500]">
              <p className="font-semibold text-sm text-[--color-healthy-600]">All Inventory Healthy</p>
              <p className="mt-1">No items currently below safety stock or reorder thresholds.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[--color-border]">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left uppercase text-[--color-ink-500]">
                    <th className="py-2.5 px-3 font-semibold">Part / Component</th>
                    <th className="py-2.5 px-3 font-semibold">Current Stock</th>
                    <th className="py-2.5 px-3 font-semibold">Safety Stock</th>
                    <th className="py-2.5 px-3 font-semibold">Reorder Point</th>
                    <th className="py-2.5 px-3 font-semibold">Supply Left</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-1] transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-[--color-ink-900]">{item.part}</p>
                        <p className="text-[10px] text-[--color-ink-500]">{item.category}</p>
                      </td>
                      <td className="py-2.5 px-3 tabular font-black text-red-600">
                        {item.currentStock} units
                      </td>
                      <td className="py-2.5 px-3 tabular text-[--color-ink-500]">{item.safetyStock} units</td>
                      <td className="py-2.5 px-3 tabular text-[--color-ink-500]">{item.reorderPoint} units</td>
                      <td className="py-2.5 px-3 tabular font-medium text-[--color-ink-700]">
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

        {/* MODAL FOOTER ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[--color-border] bg-[--color-surface-1] p-4 text-xs">
          <button
            onClick={handleGoToInventory}
            className="flex items-center justify-center gap-1.5 text-[--color-forecast-600] font-semibold hover:underline"
          >
            <Boxes size={14} /> Open Full Inventory Manager
          </button>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={closeAlertModal}
              className="flex-1 sm:flex-none rounded-lg border border-[--color-border] bg-[--color-surface-0] px-4 py-2 text-xs font-medium text-[--color-ink-700] hover:bg-[--color-surface-2] transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleCreatePo}
              disabled={lowStockItems.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40 transition-colors shadow-sm"
            >
              <ShoppingCart size={14} />
              Reorder All Low Stock Parts
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
