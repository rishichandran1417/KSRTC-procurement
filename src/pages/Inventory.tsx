import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit3, Sliders, X, AlertTriangle } from "lucide-react";
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
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setStatusFilter("Critical")}
                className="rounded border border-red-500/30 bg-[--color-surface-0] px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                Filter Critical
              </button>
              <button
                onClick={openAlertModal}
                className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition-colors cursor-pointer"
              >
                Review & Reorder All →
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
            className="flex items-center justify-center gap-1.5 rounded bg-[--color-forecast-500] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-[--color-forecast-700] w-full sm:w-auto cursor-pointer shadow-xs active:scale-98 transition-all"
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
                    <td className="tabular px-2 py-2.5 font-semibold">{item.currentStock}</td>
                    <td className="tabular px-2 py-2.5 text-[--color-ink-500]">{item.safetyStock}</td>
                    <td className="tabular px-2 py-2.5 text-[--color-ink-500]">{item.reorderPoint}</td>
                    <td className="tabular px-2 py-2.5 text-[--color-ink-700]">{item.forecastDemand}</td>
                    <td className="tabular px-2 py-2.5">{item.daysOfSupply}d</td>
                    <td className="px-2 py-2.5">
                      <StatusBadge label={item.status} />
                    </td>
                    <td className="px-2 py-2.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setAdjustingItem(item)}
                          title="Adjust Quantity"
                          className="rounded p-1 text-[--color-ink-600] hover:bg-[--color-surface-2]"
                        >
                          <Sliders size={14} />
                        </button>
                        <button
                          onClick={() => setEditingItem(item)}
                          title="Edit Item"
                          className="rounded p-1 text-[--color-forecast-600] hover:bg-[--color-surface-2]"
                        >
                          <Edit3 size={14} />
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
        <InventoryDetailDrawer item={selectedDetail} onClose={() => setSelectedDetail(null)} />
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

function InventoryDetailDrawer({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const [consumption, setConsumption] = useState<ConsumptionRecord[]>([]);
  const [prices, setPrices] = useState<PriceRecord[]>([]);

  useEffect(() => {
    getConsumptionHistory(item.id).then(setConsumption);
    getPriceHistory(item.part).then(setPrices);
  }, [item]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div
        className="h-full w-full sm:max-w-md overflow-y-auto border-l border-[--color-border-strong] bg-[#121620] p-5 sm:p-6 shadow-2xl text-[--color-ink-900]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[--color-border] pb-3">
          <div>
            <h2 className="text-lg font-bold text-[--color-ink-900]">{item.part}</h2>
            <p className="text-xs text-[--color-ink-500]">Category: {item.category}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-[--color-ink-500] hover:bg-[--color-surface-1]">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Stat label="Current Inventory" value={`${item.currentStock} units`} />
          <Stat label="Forecast Demand" value={`${item.forecastDemand} units`} />
          <Stat label="Safety Stock" value={`${item.safetyStock} units`} />
          <Stat label="Reorder Point" value={`${item.reorderPoint} units`} />
          <Stat label="Days of Supply" value={`${item.daysOfSupply} days`} />
          <Stat label="Stock Status" value={item.status} />
        </div>

        {item.notes ? (
          <div className="mt-3 rounded border border-[--color-border] bg-[--color-surface-1] p-2.5 text-xs">
            <span className="font-semibold text-[--color-ink-700]">Notes: </span>
            <span className="text-[--color-ink-500]">{item.notes}</span>
          </div>
        ) : null}

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-[--color-ink-500]">
          Historical Consumption (Past 6 Months)
        </p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={consumption}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="quantity" stroke="var(--color-forecast-500)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-[--color-ink-500]">
          Purchase Price History (From PO Data)
        </p>
        <div className="space-y-1.5 text-xs">
          {prices.map((p, i) => (
            <div key={i} className="flex justify-between border-b border-[--color-border] pb-1">
              <span className="text-[--color-ink-500]">{p.date} · {p.supplier}</span>
              <span className="tabular font-medium text-[--color-ink-900]">₹{p.unitPrice}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2.5">
      <p className="text-[11px] text-[--color-ink-500]">{label}</p>
      <p className="tabular font-semibold text-[--color-ink-900]">{value}</p>
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
    addInventoryItem(payload).then(() => {
      setSubmitting(false);
      onAdded();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[--color-border-strong] bg-[#121620] p-5 sm:p-6 shadow-2xl text-[--color-ink-900]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[--color-border] pb-3 mb-4">
          <h2 className="text-base font-semibold text-[--color-ink-900]">Add New Inventory Item</h2>
          <button onClick={onClose} className="rounded p-1 text-[--color-ink-500] hover:bg-[--color-surface-1] cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-[--color-ink-700]">Part / Component Name *</label>
            <input
              required
              placeholder="Enter component name"
              value={part}
              onChange={(e) => setPart(e.target.value)}
              className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[--color-ink-700]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-sm"
              >
                {["Brake Parts", "Filters", "Bearings", "Tyres", "Electricals", "Fluids"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[--color-ink-700]">Current Stock Quantity</label>
              <input
                type="number"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[--color-ink-700]">Minimum Safety Stock</label>
              <input
                type="number"
                min="0"
                value={safetyStock}
                onChange={(e) => setSafetyStock(Number(e.target.value))}
                className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm tabular"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[--color-ink-700]">Reorder Point</label>
              <input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(Number(e.target.value))}
                className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm tabular"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[--color-ink-700]">Notes / Storage Location</label>
            <textarea
              rows={2}
              placeholder="Storage location or notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-[--color-border]">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[--color-border] px-4 py-1.5 text-xs text-[--color-ink-700] hover:bg-[--color-surface-1]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-[--color-forecast-500] px-4 py-1.5 text-xs font-medium text-white hover:bg-[--color-forecast-700]"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[--color-border-strong] bg-[#121620] p-5 sm:p-6 shadow-2xl text-[--color-ink-900]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[--color-border] pb-3 mb-4">
          <h2 className="text-base font-semibold text-[--color-ink-900]">Edit Inventory Item — {item.part}</h2>
          <button onClick={onClose} className="rounded p-1 text-[--color-ink-500] hover:bg-[--color-surface-1] cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-[--color-ink-700]">Part Name</label>
            <input
              required
              value={part}
              onChange={(e) => setPart(e.target.value)}
              className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[--color-ink-700]">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[--color-ink-700]">Current Stock</label>
              <input
                type="number"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[--color-ink-700]">Safety Stock</label>
              <input
                type="number"
                value={safetyStock}
                onChange={(e) => setSafetyStock(Number(e.target.value))}
                className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm tabular"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[--color-ink-700]">Reorder Point</label>
              <input
                type="number"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(Number(e.target.value))}
                className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm tabular"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[--color-ink-700]">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-[--color-border]">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[--color-border] px-4 py-1.5 text-xs text-[--color-ink-700] hover:bg-[--color-surface-1] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-[--color-forecast-500] px-4 py-1.5 text-xs font-medium text-white hover:bg-[--color-forecast-700] cursor-pointer"
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
  const [delta, setDelta] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  const applyAdjustment = (dir: 1 | -1) => {
    setSubmitting(true);
    adjustInventoryQuantity(item.id, dir * delta).then(() => {
      setSubmitting(false);
      onAdjusted();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-[--color-border-strong] bg-[#121620] p-5 shadow-2xl text-sm text-[--color-ink-900]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[--color-border] pb-2 mb-3">
          <h3 className="font-semibold text-[--color-ink-900]">Adjust Quantity — {item.part}</h3>
          <button onClick={onClose} className="rounded p-1 text-[--color-ink-500] hover:bg-[--color-surface-1] cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[--color-ink-500]">Current Stock: <span className="font-semibold text-[--color-ink-900] tabular">{item.currentStock} units</span></p>

        <div className="mt-4">
          <label className="mb-1 block text-xs text-[--color-ink-700]">Adjustment Amount</label>
          <input
            type="number"
            min="1"
            value={delta}
            onChange={(e) => setDelta(Math.max(1, Number(e.target.value)))}
            className="w-full rounded border border-[--color-border] px-3 py-1.5 tabular"
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => applyAdjustment(-1)}
            disabled={submitting}
            className="flex-1 rounded border border-[--color-critical-500] bg-[--color-critical-500]/10 py-1.5 text-xs font-medium text-[--color-critical-500] hover:bg-[--color-critical-500]/20"
          >
            - Deduct {delta} Units
          </button>
          <button
            onClick={() => applyAdjustment(1)}
            disabled={submitting}
            className="flex-1 rounded bg-[--color-forecast-500] py-1.5 text-xs font-medium text-white hover:bg-[--color-forecast-700]"
          >
            + Add {delta} Units
          </button>
        </div>
      </div>
    </div>
  );
}
