import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit3, Sliders, X, AlertTriangle, Zap } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { TopBar } from "../components/layout/TopBar";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useFilters } from "../state/FiltersContext";
import { useAlerts } from "../state/AlertsContext";
import {
  getInventory, addInventoryItem, updateInventoryItem, adjustInventoryQuantity,
  getConsumptionHistory, getPriceHistory
} from "../services/inventoryApi";
import type { InventoryItem, AddInventoryPayload, ConsumptionRecord, PriceRecord } from "../types";

export default function Inventory() {
  const navigate = useNavigate();
  const { filters } = useFilters();
  const { openAlertModal, totalAlerts, criticalItems, warningItems } = useAlerts();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [search, setSearch] = useState("");

  const [selectedDetail, setSelectedDetail] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getInventory()
      .then(setItems)
      .catch(() => setError("Could not load inventory from the database."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filteredItems = useMemo(
    () =>
      items.filter((i) => {
        if (filters.category !== "All Categories" && i.category !== filters.category) return false;
        if (statusFilter !== "All" && i.status !== statusFilter) return false;
        if (search && !i.part.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [items, filters.category, statusFilter, search]
  );

  return (
    <div>
      <TopBar title="Inventory Management" subtitle="What do we have? — Current stock levels & safety thresholds" />

      <div className="p-4 sm:p-6">
        {totalAlerts > 0 && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 sm:p-4 text-xs sm:text-sm">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5 sm:mt-0" size={18} />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-300">
                  Low Stock Alert: {totalAlerts} items require attention
                </p>
                <p className="text-red-600/80 dark:text-red-400/80 text-xs">
                  {criticalItems.length} critical stockout risk &bull; {warningItems.length} below reorder threshold
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setStatusFilter("Critical")}
                className="rounded-lg border border-red-500/30 bg-[--color-surface-0] px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                Filter Critical
              </button>
              <button
                onClick={() => {
                  const target = criticalItems.length > 0 ? criticalItems : items.filter((i) => i.status === "Critical");
                  const poItems = target.map((item) => {
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
                      items: poItems,
                      source: "critical",
                      isCritical: true,
                      notes: "Emergency Critical Stockout Procurement (Critical Buy)",
                    },
                  });
                }}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
              >
                <Zap size={13} className="fill-white" />
                <span>⚡ Critical Buy ({criticalItems.length > 0 ? criticalItems.length : totalAlerts})</span>
              </button>
              <button
                onClick={openAlertModal}
                className="rounded-lg bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 text-xs font-semibold shadow-xs hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer"
              >
                Review All Alerts →
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64 min-w-[180px]">
              <input
                placeholder="Search part or component…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border border-[--color-border] bg-[--color-surface-0] pl-8 pr-3 py-1.5 text-sm"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-[--color-ink-400]" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-sm"
            >
              {["All", "Healthy", "Warning", "Critical"].map((s) => (
                <option key={s} value={s}>{s} Stock</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer w-full sm:w-auto"
          >
            <Plus size={16} /> Add Inventory
          </button>
        </div>

        {loading ? (
          <LoadingState label="Loading inventory records…" />
        ) : error ? (
          <ErrorState title="Inventory unavailable." message={error} onRetry={load} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? "No inventory items registered yet" : "No matching inventory items"}
            message={
              items.length === 0
                ? "Your inventory is currently empty. Click 'Add Inventory' above to register your first spare part."
                : "Try adjusting search or category filters."
            }
          />
        ) : (
          <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="border-b border-[--color-border] text-left text-xs uppercase tracking-wide text-[--color-ink-500]">
                    <th className="px-4 py-2.5">Part / Item</th>
                  <th className="px-2 py-2.5">Category</th>
                  <th className="px-2 py-2.5">Current Stock</th>
                  <th className="px-2 py-2.5">Safety Stock</th>
                  <th className="px-2 py-2.5">Reorder Point</th>
                  <th className="px-2 py-2.5">Forecast Demand</th>
                  <th className="px-2 py-2.5">Days of Supply</th>
                  <th className="px-2 py-2.5">Stock Status</th>
                  <th className="px-2 py-2.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-1]"
                  >
                    <td
                      onClick={() => setSelectedDetail(item)}
                      className="cursor-pointer px-4 py-2.5 font-medium text-[--color-ink-900] hover:underline"
                    >
                      {item.part}
                    </td>
                    <td className="px-2 py-2.5 text-[--color-ink-700]">{item.category}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="tabular font-bold text-sm text-[--color-ink-900]">{item.currentStock}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdjustingItem(item);
                          }}
                          title="Change Stock Quantity"
                          className="inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-900/60 cursor-pointer shadow-2xs"
                        >
                          <Sliders size={11} />
                          <span>Change</span>
                        </button>
                      </div>
                    </td>
                    <td className="tabular px-2 py-2.5 text-[--color-ink-500]">{item.safetyStock}</td>
                    <td className="tabular px-2 py-2.5 text-[--color-ink-500]">{item.reorderPoint}</td>
                    <td className="tabular px-2 py-2.5 text-[--color-ink-700]">{item.forecastDemand}</td>
                    <td className="tabular px-2 py-2.5">{item.daysOfSupply}d</td>
                    <td className="px-2 py-2.5">
                      <StatusBadge label={item.status} />
                    </td>
                    <td className="px-2 py-2.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setAdjustingItem(item)}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          <Sliders size={12} />
                          <span>Change Stock</span>
                        </button>
                        <button
                          onClick={() => setEditingItem(item)}
                          title="Edit Part Details"
                          className="rounded-md border border-[--color-border] bg-[--color-surface-2] p-1.5 text-[--color-ink-700] hover:text-[--color-ink-900] active:scale-95 transition-all cursor-pointer shadow-2xs"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      {selectedDetail ? (
        <InventoryDetailDrawer
          item={selectedDetail}
          onClose={() => setSelectedDetail(null)}
          onAdjustStock={() => {
            const cur = selectedDetail;
            setSelectedDetail(null);
            setAdjustingItem(cur);
          }}
        />
      ) : null}

      {/* ADD ITEM MODAL */}
      {showAddModal ? (
        <AddInventoryModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            load();
          }}
        />
      ) : null}

      {/* EDIT ITEM MODAL */}
      {editingItem ? (
        <EditInventoryModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdated={() => {
            setEditingItem(null);
            load();
          }}
        />
      ) : null}

      {/* ADJUST QUANTITY MODAL */}
      {adjustingItem ? (
        <AdjustQuantityModal
          item={adjustingItem}
          onClose={() => setAdjustingItem(null)}
          onAdjusted={() => {
            setAdjustingItem(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function InventoryDetailDrawer({ item, onClose, onAdjustStock }: { item: InventoryItem; onClose: () => void; onAdjustStock: () => void }) {
  const [consumption, setConsumption] = useState<ConsumptionRecord[]>([]);
  const [prices, setPrices] = useState<PriceRecord[]>([]);

  useEffect(() => {
    getConsumptionHistory(item.id).then(setConsumption);
    getPriceHistory(item.part).then(setPrices);
  }, [item]);

  const demandVal =
    item.forecastDemand !== undefined && item.forecastDemand !== null
      ? `${item.forecastDemand} units`
      : item.reorderPoint
      ? `${Math.round(item.reorderPoint * 1.5)} units`
      : "—";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full sm:max-w-md overflow-y-auto border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-zinc-100"
        style={{ backgroundColor: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">{item.part}</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Category: {item.category}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
          <Stat label="Current Inventory" value={`${item.currentStock} units`} />
          <Stat label="Forecast Demand" value={demandVal} />
          <Stat label="Safety Stock" value={`${item.safetyStock} units`} />
          <Stat label="Reorder Point" value={`${item.reorderPoint} units`} />
          <Stat label="Days of Supply" value={`${item.daysOfSupply} days`} />
          <Stat label="Stock Status" value={item.status || "Healthy"} />
        </div>

        <button
          type="button"
          onClick={onAdjustStock}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <Sliders size={14} />
          <span>Change / Adjust Stock Count</span>
        </button>

        {item.notes ? (
          <div className="mt-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/80 p-2.5 text-xs">
            <span className="font-semibold text-slate-700 dark:text-zinc-300">Notes: </span>
            <span className="text-slate-500 dark:text-zinc-400">{item.notes}</span>
          </div>
        ) : null}

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          Historical Consumption (Past 6 Months)
        </p>
        <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 p-2">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={consumption}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="quantity" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          Purchase Price History (From PO Data)
        </p>
        <div className="space-y-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 p-3">
          {prices.length === 0 ? (
            <p className="text-slate-400 dark:text-zinc-500 text-center py-2">No past PO purchase records found.</p>
          ) : (
            prices.map((p, i) => (
              <div key={i} className="flex justify-between border-b border-slate-200/60 dark:border-zinc-700/60 pb-1 last:border-0 last:pb-0">
                <span className="text-slate-500 dark:text-zinc-400">{p.date} · {p.supplier}</span>
                <span className="tabular font-medium text-slate-900 dark:text-zinc-100">₹{p.unitPrice}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/80 p-2.5">
      <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">{label}</p>
      <p className="tabular font-semibold text-slate-900 dark:text-zinc-100 mt-0.5">{value}</p>
    </div>
  );
}

function AddInventoryModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [part, setPart] = useState("");
  const [category, setCategory] = useState("Brake Parts");
  const [currentStock, setCurrentStock] = useState(100);
  const [safetyStock, setSafetyStock] = useState(50);
  const [reorderPoint, setReorderPoint] = useState(80);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!part.trim()) return;
    setSubmitting(true);
    const payload: AddInventoryPayload = {
      part,
      category,
      currentStock,
      safetyStock,
      reorderPoint,
      notes,
    };
    addInventoryItem(payload)
      .then(() => {
        setSubmitting(false);
        onAdded();
      })
      .catch((err) => {
        console.error("Error adding item:", err);
        setSubmitting(false);
        onAdded();
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-zinc-100"
        style={{ backgroundColor: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3 mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Add New Inventory Item</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300">Part / Component Name *</label>
            <input
              required
              placeholder="Enter component name"
              value={part}
              onChange={(e) => setPart(e.target.value)}
              className="w-full rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-slate-900 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-slate-900 dark:text-zinc-100"
              >
                {["Brake Parts", "Filters", "Bearings", "Tyres", "Electricals", "Fluids"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300">Current Stock Quantity</label>
              <input
                type="number"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm tabular text-slate-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300">Minimum Safety Stock</label>
              <input
                type="number"
                min="0"
                value={safetyStock}
                onChange={(e) => setSafetyStock(Number(e.target.value))}
                className="w-full rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm tabular text-slate-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300">Reorder Point</label>
              <input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(Number(e.target.value))}
                className="w-full rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm tabular text-slate-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300">Notes / Storage Location</label>
            <textarea
              rows={2}
              placeholder="Storage location or notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-slate-900 dark:text-zinc-100"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-200 dark:border-zinc-700 px-4 py-1.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
            >
              {submitting ? "Saving…" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditInventoryModal({ item, onClose, onUpdated }: { item: InventoryItem; onClose: () => void; onUpdated: () => void }) {
  const [part, setPart] = useState(item.part);
  const [category, setCategory] = useState(item.category);
  const [currentStock, setCurrentStock] = useState(item.currentStock);
  const [safetyStock, setSafetyStock] = useState(item.safetyStock);
  const [reorderPoint, setReorderPoint] = useState(item.reorderPoint);
  const [notes, setNotes] = useState(item.notes || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    updateInventoryItem(item.id, {
      part,
      category,
      currentStock,
      safetyStock,
      reorderPoint,
      notes,
    }).then(() => {
      setSubmitting(false);
      onUpdated();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-zinc-100"
        style={{ backgroundColor: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3 mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Edit Inventory Item — {item.part}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300">Part Name</label>
            <input
              required
              value={part}
              onChange={(e) => setPart(e.target.value)}
              className="w-full rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-slate-900 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-slate-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300">Current Stock</label>
              <input
                type="number"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm tabular text-slate-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300">Safety Stock</label>
              <input
                type="number"
                value={safetyStock}
                onChange={(e) => setSafetyStock(Number(e.target.value))}
                className="w-full rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm tabular text-slate-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300">Reorder Point</label>
              <input
                type="number"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(Number(e.target.value))}
                className="w-full rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm tabular text-slate-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-zinc-300">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-slate-900 dark:text-zinc-100"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-200 dark:border-zinc-700 px-4 py-1.5 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustQuantityModal({ item, onClose, onAdjusted }: { item: InventoryItem; onClose: () => void; onAdjusted: () => void }) {
  const [exactStock, setExactStock] = useState<number>(item.currentStock);
  const [delta, setDelta] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  const applyDelta = (dir: 1 | -1) => {
    setSubmitting(true);
    adjustInventoryQuantity(item.id, dir * delta)
      .then(() => {
        setSubmitting(false);
        onAdjusted();
      })
      .catch((err) => {
        console.error("Adjustment error:", err);
        setSubmitting(false);
        onAdjusted();
      });
  };

  const applyExact = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    updateInventoryItem(item.id, { currentStock: Math.max(0, exactStock) })
      .then(() => {
        setSubmitting(false);
        onAdjusted();
      })
      .catch((err) => {
        console.error("Exact stock error:", err);
        setSubmitting(false);
        onAdjusted();
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl text-sm text-slate-900 dark:text-zinc-100"
        style={{ backgroundColor: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2.5 mb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-zinc-100">Change Stock Quantity</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">{item.part}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-3 mb-4">
          <p className="text-xs text-blue-700 dark:text-blue-300">Current On-Hand Stock</p>
          <p className="text-2xl font-bold tabular text-blue-900 dark:text-blue-200 mt-0.5">{item.currentStock} units</p>
        </div>

        {/* Set Exact New Stock */}
        <form onSubmit={applyExact} className="space-y-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
              Set Exact New Stock Count
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={exactStock}
                onChange={(e) => setExactStock(Math.max(0, Number(e.target.value)))}
                className="flex-1 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm tabular font-semibold text-slate-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                {submitting ? "Saving…" : "Set Stock"}
              </button>
            </div>
          </div>
        </form>

        {/* Quick Adjustment Options */}
        <div className="mt-4 space-y-2.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
            Or Quick Add / Deduct
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={delta}
              onChange={(e) => setDelta(Math.max(1, Number(e.target.value)))}
              className="w-24 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs tabular font-medium text-slate-900 dark:text-zinc-100"
            />
            <span className="text-xs text-slate-500">units</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => applyDelta(-1)}
              disabled={submitting || item.currentStock === 0}
              className="flex-1 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 disabled:opacity-40 cursor-pointer transition-all"
            >
              - Deduct {delta}
            </button>
            <button
              type="button"
              onClick={() => applyDelta(1)}
              disabled={submitting}
              className="flex-1 rounded-lg border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer transition-all"
            >
              + Add {delta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
