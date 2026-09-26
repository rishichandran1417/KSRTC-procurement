import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Edit3, Sliders, X, AlertTriangle, Zap,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight
} from "lucide-react";
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

export type InventorySortField =
  | "part"
  | "category"
  | "currentStock"
  | "safetyStock"
  | "reorderPoint"
  | "forecastDemand"
  | "daysOfSupply"
  | "status";

export default function Inventory() {
  const navigate = useNavigate();
  const { filters } = useFilters();
  const { openAlertModal, totalAlerts, criticalItems, warningItems, refreshAlerts } = useAlerts();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [search, setSearch] = useState("");

  // Sort and pagination states
  const [sortField, setSortField] = useState<InventorySortField>("part");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  const handleSort = (field: InventorySortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      if (["currentStock", "safetyStock", "reorderPoint", "forecastDemand", "daysOfSupply"].includes(field)) {
        setSortDirection("desc");
      } else {
        setSortDirection("asc");
      }
    }
    setCurrentPage(1);
  };

  const filteredAndSortedItems = useMemo(() => {
    let list = items.filter((i) => {
      if (filters.category !== "All Categories" && i.category !== filters.category) return false;
      if (statusFilter !== "All" && i.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchPart = (i.part || "").toLowerCase().includes(q);
        const matchCat = (i.category || "").toLowerCase().includes(q);
        const matchNotes = (i.notes || "").toLowerCase().includes(q);
        if (!matchPart && !matchCat && !matchNotes) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "part":
          cmp = (a.part || "").localeCompare(b.part || "");
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "");
          break;
        case "currentStock":
          cmp = (a.currentStock ?? 0) - (b.currentStock ?? 0);
          break;
        case "safetyStock":
          cmp = (a.safetyStock ?? 0) - (b.safetyStock ?? 0);
          break;
        case "reorderPoint":
          cmp = (a.reorderPoint ?? 0) - (b.reorderPoint ?? 0);
          break;
        case "forecastDemand":
          cmp = (a.forecastDemand ?? 0) - (b.forecastDemand ?? 0);
          break;
        case "daysOfSupply":
          cmp = (a.daysOfSupply ?? 0) - (b.daysOfSupply ?? 0);
          break;
        case "status": {
          const rank: Record<string, number> = { Critical: 0, Warning: 1, Healthy: 2 };
          cmp = (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
          break;
        }
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [items, filters.category, statusFilter, search, sortField, sortDirection]);

  const totalItems = filteredAndSortedItems.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = pageSize === -1 ? 0 : (safeCurrentPage - 1) * pageSize;
  const paginatedItems =
    pageSize === -1
      ? filteredAndSortedItems
      : filteredAndSortedItems.slice(startIdx, startIdx + pageSize);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, "...", totalPages];
  };

  const renderSortHeader = (label: string, field: InventorySortField, className = "") => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`cursor-pointer py-3 px-3 transition-colors hover:text-blue-600 dark:hover:text-blue-400 group select-none ${
          isActive ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-[--color-ink-500]"
        } ${className}`}
      >
        <div className="inline-flex items-center gap-1">
          <span>{label}</span>
          <span className="shrink-0">
            {isActive ? (
              sortDirection === "asc" ? (
                <ArrowUp size={12} className="text-blue-600 dark:text-blue-400" />
              ) : (
                <ArrowDown size={12} className="text-blue-600 dark:text-blue-400" />
              )
            ) : (
              <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div>
      <TopBar title="Inventory Management" subtitle="What do we have? — Current stock levels & safety thresholds" />

      <div className="p-4 sm:p-6">
        {totalAlerts > 0 && (
          <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border border-rose-500/25 bg-rose-500/5 dark:bg-rose-950/20 p-3.5 sm:p-4 text-xs sm:text-sm">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-500 shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="font-semibold text-rose-900 dark:text-rose-200">
                  Low Stock Alert: {totalAlerts} items require attention
                </p>
                <p className="text-rose-700/80 dark:text-rose-400/80 text-xs">
                  {criticalItems.length} critical stockout risk &bull; {warningItems.length} below reorder threshold
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setStatusFilter(statusFilter === "Critical" ? "All" : "Critical")}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === "Critical"
                    ? "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold"
                    : "border-[--color-border] bg-[--color-surface-0] text-[--color-ink-700] hover:bg-[--color-surface-1]"
                }`}
              >
                {statusFilter === "Critical" ? "✓ Filtered Critical" : "Filter Critical"}
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
                className="flex items-center gap-1.5 rounded-md bg-rose-600 hover:bg-rose-700 active:scale-95 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer"
              >
                <Zap size={13} className="fill-white" />
                <span>Critical Buy ({criticalItems.length > 0 ? criticalItems.length : totalAlerts})</span>
              </button>
              <button
                onClick={openAlertModal}
                className="rounded-md border border-[--color-border] bg-[--color-surface-0] hover:bg-[--color-surface-1] text-[--color-ink-700] px-3 py-1.5 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md border border-[--color-border] bg-[--color-surface-0] pl-8 pr-3 py-1.5 text-sm text-[--color-ink-900] placeholder:text-[--color-ink-400] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-[--color-ink-400]" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-md border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-sm text-[--color-ink-800] focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {["All", "Healthy", "Warning", "Critical"].map((s) => (
                <option key={s} value={s}>{s} Stock</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[--color-ink-500] hidden sm:inline">Sort:</span>
              <select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [f, d] = e.target.value.split("-") as [InventorySortField, "asc" | "desc"];
                  setSortField(f);
                  setSortDirection(d);
                  setCurrentPage(1);
                }}
                className="rounded-md border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-xs text-[--color-ink-800] focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="part-asc">Part Name (A → Z)</option>
                <option value="part-desc">Part Name (Z → A)</option>
                <option value="currentStock-asc">Stock (Low → High)</option>
                <option value="currentStock-desc">Stock (High → Low)</option>
                <option value="daysOfSupply-asc">Days Supply (Lowest First)</option>
                <option value="daysOfSupply-desc">Days Supply (Highest First)</option>
                <option value="status-asc">Status (Critical First)</option>
                <option value="reorderPoint-desc">Reorder Point (High → Low)</option>
                <option value="forecastDemand-desc">Forecast (High → Low)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs transition-all cursor-pointer w-full sm:w-auto"
          >
            <Plus size={16} /> Add Inventory
          </button>
        </div>

        {loading ? (
          <LoadingState label="Loading inventory records…" />
        ) : error ? (
          <ErrorState title="Inventory unavailable." message={error} onRetry={load} />
        ) : filteredAndSortedItems.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? "No inventory items registered yet" : "No matching inventory items"}
            message={
              items.length === 0
                ? "Your inventory is currently empty. Click 'Add Inventory' above to register your first spare part."
                : "Try adjusting search, sort, or category filters."
            }
          />
        ) : (
          <div className="rounded-lg border border-[--color-border] bg-[--color-surface-0] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[780px]">
                <thead>
                  <tr className="border-b border-[--color-border] bg-[--color-surface-1]/50 text-left text-xs font-medium uppercase tracking-wider text-[--color-ink-500]">
                    {renderSortHeader("Part / Item", "part", "px-4")}
                    {renderSortHeader("Category", "category")}
                    {renderSortHeader("Current Stock", "currentStock")}
                    {renderSortHeader("Safety Stock", "safetyStock")}
                    {renderSortHeader("Reorder Point", "reorderPoint")}
                    {renderSortHeader("Forecast Demand", "forecastDemand")}
                    {renderSortHeader("Days of Supply", "daysOfSupply")}
                    {renderSortHeader("Stock Status", "status")}
                    <th className="px-3 py-3 text-right pr-4 text-[--color-ink-500] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--color-border]">
                  {paginatedItems.map((item, idx) => (
                    <tr
                      key={`inv-${item.id}-${idx}`}
                      className="hover:bg-[--color-surface-1]/70 transition-colors group"
                    >
                      <td
                        onClick={() => setSelectedDetail(item)}
                        className="cursor-pointer px-4 py-3 font-medium text-[--color-ink-900] hover:text-blue-600 transition-colors"
                      >
                        {item.part}
                      </td>
                      <td className="px-3 py-3 text-[--color-ink-600]">{item.category}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setAdjustingItem(item)}
                          title="Click to adjust stock quantity"
                          className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-left transition-colors hover:bg-[--color-surface-2] cursor-pointer"
                        >
                          <span className="tabular font-semibold text-sm text-[--color-ink-900]">{item.currentStock}</span>
                          <Sliders size={11} className="text-[--color-ink-400] opacity-40 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                      <td className="tabular px-3 py-3 text-[--color-ink-500]">{item.safetyStock}</td>
                      <td className="tabular px-3 py-3 text-[--color-ink-500]">{item.reorderPoint}</td>
                      <td className="tabular px-3 py-3 text-[--color-ink-700]">{item.forecastDemand} <span className="text-[11px] text-[--color-ink-400]">/mo</span></td>
                      <td className="tabular px-3 py-3">
                        {item.daysOfSupply <= 5 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 text-xs">
                            {item.daysOfSupply}d
                            <span className="text-[10px] font-normal opacity-80">(low)</span>
                          </span>
                        ) : (
                          <span className="text-[--color-ink-700] font-medium">{item.daysOfSupply}d</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge label={item.status} />
                      </td>
                      <td className="px-3 py-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setAdjustingItem(item)}
                            title="Adjust quantity"
                            className="inline-flex items-center gap-1.5 rounded-md border border-[--color-border] bg-[--color-surface-1] hover:bg-[--color-surface-2] px-2.5 py-1 text-xs font-medium text-[--color-ink-700] hover:text-[--color-ink-900] transition-colors cursor-pointer shadow-2xs"
                          >
                            <Sliders size={12} className="text-[--color-ink-500]" />
                            <span>Adjust</span>
                          </button>
                          <button
                            onClick={() => setEditingItem(item)}
                            title="Edit Part Details"
                            className="rounded-md border border-[--color-border] bg-[--color-surface-1] hover:bg-[--color-surface-2] p-1.5 text-[--color-ink-600] hover:text-[--color-ink-900] transition-colors cursor-pointer shadow-2xs"
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

            {/* PAGINATION FOOTER */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[--color-border] px-4 py-3 bg-[--color-surface-0]">
              <div className="flex items-center gap-3 text-xs text-[--color-ink-500]">
                <span>
                  Showing <strong className="text-[--color-ink-900]">{startIdx + 1}</strong> to{" "}
                  <strong className="text-[--color-ink-900]">{Math.min(startIdx + (pageSize === -1 ? totalItems : pageSize), totalItems)}</strong> of{" "}
                  <strong className="text-[--color-ink-900]">{totalItems.toLocaleString("en-IN")}</strong> parts
                </span>

                <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-[--color-border]">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded border border-[--color-border] bg-[--color-surface-0] px-1.5 py-0.5 text-xs text-[--color-ink-800]"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={-1}>All</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && pageSize !== -1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="p-1 rounded border border-[--color-border] text-[--color-ink-600] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[--color-surface-1]"
                    title="First page"
                  >
                    <ChevronsLeft size={14} />
                  </button>

                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="p-1 rounded border border-[--color-border] text-[--color-ink-600] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[--color-surface-1]"
                    title="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {getPageNumbers().map((num, i) =>
                      num === "..." ? (
                        <span key={`dots-${i}`} className="px-1 text-xs text-[--color-ink-400]">
                          …
                        </span>
                      ) : (
                        <button
                          key={`page-${num}`}
                          onClick={() => setCurrentPage(Number(num))}
                          className={`min-w-[26px] h-[26px] rounded text-xs font-medium transition-colors ${
                            safeCurrentPage === num
                              ? "bg-blue-600 text-white font-semibold"
                              : "border border-[--color-border] text-[--color-ink-700] hover:bg-[--color-surface-1]"
                          }`}
                        >
                          {num}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="p-1 rounded border border-[--color-border] text-[--color-ink-600] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[--color-surface-1]"
                    title="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>

                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="p-1 rounded border border-[--color-border] text-[--color-ink-600] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[--color-surface-1]"
                    title="Last page"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              )}
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
            refreshAlerts();
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
            refreshAlerts();
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
            refreshAlerts();
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
        className="h-full w-full sm:max-w-md overflow-y-auto border-l border-[--color-border] bg-[--color-surface-0] p-5 sm:p-6 shadow-2xl text-[--color-ink-900]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[--color-border] pb-3">
          <div>
            <h2 className="text-lg font-bold text-[--color-ink-900]">{item.part}</h2>
            <p className="text-xs text-[--color-ink-500]">Category: {item.category}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[--color-ink-400] hover:text-[--color-ink-700] hover:bg-[--color-surface-1] transition-colors cursor-pointer"
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
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <Sliders size={14} />
          <span>Adjust Stock Quantity</span>
        </button>

        {item.notes ? (
          <div className="mt-3 rounded-lg border border-[--color-border] bg-[--color-surface-1] p-2.5 text-xs">
            <span className="font-semibold text-[--color-ink-700]">Notes: </span>
            <span className="text-[--color-ink-500]">{item.notes}</span>
          </div>
        ) : null}

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-[--color-ink-500]">
          Historical Consumption (Past 6 Months)
        </p>
        <div className="rounded-lg border border-[--color-border] bg-[--color-surface-1] p-2">
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
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[--color-border] bg-[--color-surface-0] p-5 sm:p-6 shadow-2xl text-[--color-ink-900]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[--color-border] pb-3 mb-4">
          <h2 className="text-base font-semibold text-[--color-ink-900]">Add New Inventory Item</h2>
          <button onClick={onClose} className="rounded p-1 text-[--color-ink-400] hover:text-[--color-ink-700] hover:bg-[--color-surface-1] transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">Part / Component Name *</label>
            <input
              required
              placeholder="e.g., Fuel Filter FF-505"
              value={part}
              onChange={(e) => setPart(e.target.value)}
              className="w-full rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-sm text-[--color-ink-900] placeholder:text-[--color-ink-400] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-sm text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {["Brake Parts", "Filters", "Bearings", "Tyres", "Electricals", "Fluids", "Engine", "Transmission"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">Current Stock Quantity</label>
              <input
                type="number"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-sm tabular text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">Safety Stock Threshold</label>
              <input
                type="number"
                min="0"
                value={safetyStock}
                onChange={(e) => setSafetyStock(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-sm tabular text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">Reorder Trigger Point</label>
              <input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-sm tabular text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">Notes / Storage Location</label>
            <textarea
              rows={2}
              placeholder="Storage location or notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-sm text-[--color-ink-900] placeholder:text-[--color-ink-400] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="mt-5 flex justify-end gap-2.5 pt-3 border-t border-[--color-border]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[--color-border] px-3.5 py-1.5 text-xs font-medium text-[--color-ink-700] hover:bg-[--color-surface-1] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
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
      part: part.trim(),
      category: category.trim(),
      currentStock,
      safetyStock,
      reorderPoint,
      notes,
    })
      .then(() => {
        setSubmitting(false);
        onUpdated();
      })
      .catch((err) => {
        console.error("Update error:", err);
        setSubmitting(false);
        onUpdated();
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[--color-border] bg-[--color-surface-0] p-5 sm:p-6 shadow-2xl text-[--color-ink-900]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[--color-border] pb-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-[--color-ink-900]">Edit Inventory Item</h2>
            <p className="text-xs text-[--color-ink-500] mt-0.5">{item.part}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-[--color-ink-400] hover:text-[--color-ink-700] hover:bg-[--color-surface-1] transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">Part / Component Name</label>
            <input
              required
              value={part}
              onChange={(e) => setPart(e.target.value)}
              className="w-full rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-sm text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-sm text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">Current Stock Count</label>
              <input
                type="number"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-sm tabular text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">Safety Stock Threshold</label>
              <input
                type="number"
                min="0"
                value={safetyStock}
                onChange={(e) => setSafetyStock(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-sm tabular text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">Reorder Trigger Point</label>
              <input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-sm tabular text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">Location & Storage Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-sm text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="mt-5 flex justify-end gap-2.5 pt-3 border-t border-[--color-border]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[--color-border] px-3.5 py-1.5 text-xs font-medium text-[--color-ink-700] hover:bg-[--color-surface-1] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
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
    adjustInventoryQuantity(item.id, dir * delta, item.part)
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
    updateInventoryItem(item.id, { currentStock: Math.max(0, exactStock), part: item.part })
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
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl border border-[--color-border] bg-[--color-surface-0] p-5 sm:p-6 shadow-2xl text-sm text-[--color-ink-900]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[--color-border] pb-3 mb-4">
          <div>
            <h3 className="font-semibold text-[--color-ink-900]">Adjust Stock Quantity</h3>
            <p className="text-xs text-[--color-ink-500] mt-0.5">{item.part}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-[--color-ink-400] hover:text-[--color-ink-700] hover:bg-[--color-surface-1] transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-lg bg-[--color-surface-1] border border-[--color-border] p-3 mb-4">
          <p className="text-xs text-[--color-ink-500]">Current On-Hand Stock</p>
          <p className="text-2xl font-bold tabular text-[--color-ink-900] mt-0.5">{item.currentStock} <span className="text-xs font-normal text-[--color-ink-500]">units</span></p>
        </div>

        {/* Set Exact New Stock */}
        <form onSubmit={applyExact} className="space-y-3 pb-4 border-b border-[--color-border]">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[--color-ink-700]">
              Set Exact Stock Count
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={exactStock}
                onChange={(e) => setExactStock(Math.max(0, Number(e.target.value)))}
                className="flex-1 rounded-md border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-sm tabular font-semibold text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3.5 py-1.5 text-xs font-semibold active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                {submitting ? "Saving…" : "Set"}
              </button>
            </div>
          </div>
        </form>

        {/* Quick Adjustment Options */}
        <div className="mt-4 space-y-2.5">
          <label className="block text-xs font-medium text-[--color-ink-700]">
            Quick Step Adjustment
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={delta}
              onChange={(e) => setDelta(Math.max(1, Number(e.target.value)))}
              className="w-20 rounded-md border border-[--color-border] bg-[--color-surface-1] px-2.5 py-1.5 text-xs tabular font-medium text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-xs text-[--color-ink-500]">units</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => applyDelta(-1)}
              disabled={submitting || item.currentStock === 0}
              className="flex-1 rounded-md border border-rose-500/30 bg-rose-500/10 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 disabled:opacity-40 cursor-pointer transition-colors"
            >
              - Deduct {delta}
            </button>
            <button
              type="button"
              onClick={() => applyDelta(1)}
              disabled={submitting}
              className="flex-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer transition-colors"
            >
              + Add {delta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
