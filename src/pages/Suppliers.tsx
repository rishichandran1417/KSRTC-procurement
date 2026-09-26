import { useEffect, useMemo, useState } from "react";
import { TopBar } from "../components/layout/TopBar";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";
import { getSuppliers, updateSupplier } from "../services/supplierApi";
import { getPurchaseOrders } from "../services/purchaseOrderApi";
import { getPriceHistory } from "../services/inventoryApi";
import type { Supplier, PriceRecord, PurchaseOrder } from "../types";
import {
  Phone,
  Mail,
  ChevronRight,
  X,
  Pencil,
  MapPin,
  Search,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";

export type SupplierSortField =
  | "name"
  | "category"
  | "reliabilityScore"
  | "onTimeDeliveryRate"
  | "avgLeadTimeDays"
  | "openOrders";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Search, Filter & Sort states
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [reliabilityFilter, setReliabilityFilter] = useState("All");
  const [ordersFilter, setOrdersFilter] = useState("All");
  const [leadTimeFilter, setLeadTimeFilter] = useState("All");
  const [sortField, setSortField] = useState<SupplierSortField>("reliabilityScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Edit supplier state
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLeadTime, setEditLeadTime] = useState<number>(7);
  const [editReliability, setEditReliability] = useState<number>(90);
  const [editOnTime, setEditOnTime] = useState<number>(90);
  const [savingSupplier, setSavingSupplier] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    getSuppliers()
      .then(setSuppliers)
      .catch(() => setError("Could not load supplier performance data."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Distinct category list
  const categories = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => {
      if (s.category) set.add(s.category.trim());
    });
    return Array.from(set).sort();
  }, [suppliers]);

  // Filtered & Sorted suppliers
  const filteredAndSortedSuppliers = useMemo(() => {
    let result = suppliers.filter((s) => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (s.name || "").toLowerCase().includes(q);
        const matchCat = (s.category || "").toLowerCase().includes(q);
        const matchAddr = (s.address || "").toLowerCase().includes(q);
        const matchContact = (s.contactName || "").toLowerCase().includes(q);
        const matchEmail = (s.contactEmail || "").toLowerCase().includes(q);
        const matchPhone = (s.contactPhone || "").toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchAddr && !matchContact && !matchEmail && !matchPhone) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== "All" && s.category !== categoryFilter) {
        return false;
      }

      // Reliability filter
      const rel = s.reliabilityScore ?? 90;
      if (reliabilityFilter === "95_plus" && rel < 95) return false;
      if (reliabilityFilter === "90_plus" && (rel < 90 || rel >= 95)) return false;
      if (reliabilityFilter === "below_90" && rel >= 90) return false;

      // Active orders filter
      const orders = s.openOrders ?? 0;
      if (ordersFilter === "with_orders" && orders === 0) return false;
      if (ordersFilter === "no_orders" && orders > 0) return false;

      // Lead time filter
      const lt = s.avgLeadTimeDays ?? 7;
      if (leadTimeFilter === "fast_5" && lt > 5) return false;
      if (leadTimeFilter === "std_7" && lt > 7) return false;

      return true;
    });

    // Sorting
    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "");
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "");
          break;
        case "reliabilityScore":
          cmp = (a.reliabilityScore ?? 0) - (b.reliabilityScore ?? 0);
          break;
        case "onTimeDeliveryRate":
          cmp = (a.onTimeDeliveryRate ?? 0) - (b.onTimeDeliveryRate ?? 0);
          break;
        case "avgLeadTimeDays":
          cmp = (a.avgLeadTimeDays ?? 0) - (b.avgLeadTimeDays ?? 0);
          break;
        case "openOrders":
          cmp = (a.openOrders ?? 0) - (b.openOrders ?? 0);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [suppliers, search, categoryFilter, reliabilityFilter, ordersFilter, leadTimeFilter, sortField, sortDirection]);

  const hasActiveFilters =
    search.trim() !== "" ||
    categoryFilter !== "All" ||
    reliabilityFilter !== "All" ||
    ordersFilter !== "All" ||
    leadTimeFilter !== "All";

  const resetAllFilters = () => {
    setSearch("");
    setCategoryFilter("All");
    setReliabilityFilter("All");
    setOrdersFilter("All");
    setLeadTimeFilter("All");
    setSortField("reliabilityScore");
    setSortDirection("desc");
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setEditName(s.name || "");
    setEditCategory(s.category || "");
    setEditAddress(s.address || "");
    setEditContactName(s.contactName || "");
    setEditEmail(s.contactEmail || "");
    setEditPhone(s.contactPhone || "");
    setEditLeadTime(s.avgLeadTimeDays ?? 7);
    setEditReliability(s.reliabilityScore ?? 92);
    setEditOnTime(s.onTimeDeliveryRate ?? 95);
  };

  const handleSaveSupplier = async () => {
    if (!editingSupplier) return;
    setSavingSupplier(true);
    try {
      const updated: Supplier = {
        ...editingSupplier,
        name: editName.trim() || editingSupplier.name,
        category: editCategory.trim() || editingSupplier.category,
        address: editAddress.trim() || editingSupplier.address,
        contactName: editContactName.trim() || editingSupplier.contactName,
        contactEmail: editEmail.trim() || editingSupplier.contactEmail,
        contactPhone: editPhone.trim() || editingSupplier.contactPhone,
        avgLeadTimeDays: Number(editLeadTime) || 7,
        reliabilityScore: Math.min(100, Math.max(0, Number(editReliability) || 90)),
        onTimeDeliveryRate: Math.min(100, Math.max(0, Number(editOnTime) || 90)),
      };
      await updateSupplier(updated);
      setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (selectedSupplier && selectedSupplier.id === updated.id) {
        setSelectedSupplier(updated);
      }
      setEditingSupplier(null);
    } catch (err) {
      console.error("Failed to update supplier:", err);
    } finally {
      setSavingSupplier(false);
    }
  };

  return (
    <div>
      <TopBar
        title="Supplier Dashboard"
        subtitle="Who are we buying from? — Performance & delivery reliability"
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {loading ? (
          <LoadingState label="Loading registered supplier metrics…" />
        ) : error ? (
          <ErrorState title="Suppliers unavailable." message={error} onRetry={load} />
        ) : suppliers.length === 0 ? (
          <EmptyState
            title="No registered suppliers"
            message="No supplier performance data currently available. Connect your supplier database or create purchase orders."
          />
        ) : (
          <>
            {/* SEARCH, FILTER & SORT CONTROL BAR */}
            <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-3.5 sm:p-4 shadow-2xs space-y-3">
              {/* TOP ROW: SEARCH + SORT + VIEW MODE */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by supplier name, category, city, contact person…"
                    className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] pl-9 pr-8 py-2 text-xs sm:text-sm text-[--color-ink-900] placeholder:text-[--color-ink-400] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Search size={15} className="absolute left-3 top-2.5 text-[--color-ink-400]" />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-2.5 text-[--color-ink-400] hover:text-[--color-ink-700] cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Sort & View Mode */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-[--color-ink-500]">
                    <span className="hidden sm:inline font-medium">Sort:</span>
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value as SupplierSortField)}
                      className="rounded-lg border border-[--color-border] bg-[--color-surface-1] px-2.5 py-1.5 text-xs font-semibold text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="reliabilityScore">Reliability Score</option>
                      <option value="onTimeDeliveryRate">On-Time Rate</option>
                      <option value="avgLeadTimeDays">Avg Lead Time</option>
                      <option value="openOrders">Active Open POs</option>
                      <option value="name">Supplier Name</option>
                      <option value="category">Category</option>
                    </select>

                    <button
                      onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                      title={`Sort ${sortDirection === "asc" ? "Ascending" : "Descending"} (Click to flip)`}
                      className="rounded-lg border border-[--color-border] bg-[--color-surface-1] p-1.5 text-[--color-ink-700] hover:text-[--color-ink-900] hover:bg-[--color-surface-2] active:scale-95 transition-all cursor-pointer"
                    >
                      {sortDirection === "asc" ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
                    </button>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center rounded-lg border border-[--color-border] bg-[--color-surface-1] p-0.5">
                    <button
                      onClick={() => setViewMode("grid")}
                      title="Grid Cards View"
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        viewMode === "grid"
                          ? "bg-[--color-surface-0] text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                          : "text-[--color-ink-400] hover:text-[--color-ink-700]"
                      }`}
                    >
                      <LayoutGrid size={15} />
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      title="Table Matrix View"
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        viewMode === "table"
                          ? "bg-[--color-surface-0] text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                          : "text-[--color-ink-400] hover:text-[--color-ink-700]"
                      }`}
                    >
                      <TableIcon size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* SECOND ROW: FILTER DROPDOWNS BAR */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[--color-border]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[--color-ink-500] hidden sm:inline mr-1">
                    Filters:
                  </span>

                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[210px] truncate ${
                      categoryFilter !== "All"
                        ? "border-blue-500 bg-blue-50/40 text-blue-700 dark:text-blue-300 font-semibold"
                        : "border-[--color-border] bg-[--color-surface-1] text-[--color-ink-800]"
                    }`}
                  >
                    <option value="All">All Categories ({categories.length})</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {/* Reliability Filter */}
                  <select
                    value={reliabilityFilter}
                    onChange={(e) => setReliabilityFilter(e.target.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                      reliabilityFilter !== "All"
                        ? "border-blue-500 bg-blue-50/40 text-blue-700 dark:text-blue-300 font-semibold"
                        : "border-[--color-border] bg-[--color-surface-1] text-[--color-ink-800]"
                    }`}
                  >
                    <option value="All">All Reliability</option>
                    <option value="95_plus">≥ 95% (Top Tier ⭐)</option>
                    <option value="90_plus">90% - 94% (High)</option>
                    <option value="below_90">&lt; 90% (Under Watch)</option>
                  </select>

                  {/* Lead Time Filter */}
                  <select
                    value={leadTimeFilter}
                    onChange={(e) => setLeadTimeFilter(e.target.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                      leadTimeFilter !== "All"
                        ? "border-blue-500 bg-blue-50/40 text-blue-700 dark:text-blue-300 font-semibold"
                        : "border-[--color-border] bg-[--color-surface-1] text-[--color-ink-800]"
                    }`}
                  >
                    <option value="All">All Lead Times</option>
                    <option value="fast_5">Fast (≤ 5 Days)</option>
                    <option value="std_7">Standard (≤ 7 Days)</option>
                  </select>

                  {/* Active Orders Filter */}
                  <select
                    value={ordersFilter}
                    onChange={(e) => setOrdersFilter(e.target.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                      ordersFilter !== "All"
                        ? "border-blue-500 bg-blue-50/40 text-blue-700 dark:text-blue-300 font-semibold"
                        : "border-[--color-border] bg-[--color-surface-1] text-[--color-ink-800]"
                    }`}
                  >
                    <option value="All">All Orders</option>
                    <option value="with_orders">Has Active POs</option>
                    <option value="no_orders">0 Active POs</option>
                  </select>
                </div>

                {/* Right Count & Reset */}
                <div className="flex items-center gap-3 ml-auto text-xs">
                  <span className="text-[--color-ink-500] font-medium">
                    Showing <strong className="text-[--color-ink-900]">{filteredAndSortedSuppliers.length}</strong> of {suppliers.length}
                  </span>

                  {hasActiveFilters && (
                    <button
                      onClick={resetAllFilters}
                      className="font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Reset All
                    </button>
                  )}
                </div>
              </div>

              {/* THIRD ROW: ACTIVE FILTER CHIPS (IF ANY ACTIVE) */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[--color-border] text-xs">
                  <span className="text-[--color-ink-500] text-[11px] font-medium">Active:</span>

                  {search && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 text-[11px] text-blue-700 dark:text-blue-300">
                      Keyword: "{search}"
                      <X size={11} className="cursor-pointer hover:opacity-80" onClick={() => setSearch("")} />
                    </span>
                  )}

                  {categoryFilter !== "All" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 text-[11px] text-blue-700 dark:text-blue-300">
                      Category: {categoryFilter}
                      <X size={11} className="cursor-pointer hover:opacity-80" onClick={() => setCategoryFilter("All")} />
                    </span>
                  )}

                  {reliabilityFilter !== "All" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 text-[11px] text-blue-700 dark:text-blue-300">
                      Reliability: {reliabilityFilter === "95_plus" ? "≥ 95%" : reliabilityFilter === "90_plus" ? "90-94%" : "< 90%"}
                      <X size={11} className="cursor-pointer hover:opacity-80" onClick={() => setReliabilityFilter("All")} />
                    </span>
                  )}

                  {leadTimeFilter !== "All" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 text-[11px] text-blue-700 dark:text-blue-300">
                      Lead Time: {leadTimeFilter === "fast_5" ? "≤ 5 Days" : "≤ 7 Days"}
                      <X size={11} className="cursor-pointer hover:opacity-80" onClick={() => setLeadTimeFilter("All")} />
                    </span>
                  )}

                  {ordersFilter !== "All" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 text-[11px] text-blue-700 dark:text-blue-300">
                      Orders: {ordersFilter === "with_orders" ? "Has POs" : "0 POs"}
                      <X size={11} className="cursor-pointer hover:opacity-80" onClick={() => setOrdersFilter("All")} />
                    </span>
                  )}
                </div>
              )}
            </div>

            {filteredAndSortedSuppliers.length === 0 ? (
              <EmptyState
                title="No matching suppliers found"
                message="Try clearing your search query or loosening your category, reliability, or lead time filters."
              />
            ) : viewMode === "grid" ? (
              /* CARDS LIST */
              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredAndSortedSuppliers.map((s, idx) => (
                  <div
                    key={`supp-card-${s.id}-${idx}`}
                    className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-4 transition-all hover:border-[--color-border-strong] hover:shadow-xs group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-bold text-[--color-ink-900] truncate" title={s.name}>
                          {s.name}
                        </p>
                        <p className="text-xs text-[--color-ink-500] mt-0.5 font-medium truncate" title={s.category}>
                          {s.category}
                        </p>
                        {s.address && (
                          <p
                            className="text-[11px] text-[--color-ink-400] flex items-center gap-1 mt-1 truncate max-w-[200px]"
                            title={s.address}
                          >
                            <MapPin size={11} className="shrink-0 text-[--color-ink-400]" /> {s.address}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(s);
                          }}
                          title="Edit Supplier"
                          className="rounded-lg p-1.5 text-[--color-ink-400] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-[--color-surface-2] transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setSelectedSupplier(s)}
                          title="View Details"
                          className="rounded-lg p-1.5 text-[--color-ink-400] hover:text-[--color-ink-700] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-1.5 text-xs">
                      <Row
                        label="Reliability Score"
                        value={`${s.reliabilityScore ?? 92}/100`}
                        highlight={(s.reliabilityScore ?? 92) >= 95}
                      />
                      <Row label="On-Time Delivery Rate" value={`${s.onTimeDeliveryRate ?? 95}%`} />
                      <Row label="Active Open POs" value={`${s.openOrders ?? 0} orders`} />
                      <Row label="Avg. Lead Time" value={`${s.avgLeadTimeDays ?? 7} days`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* COMPARISON MATRIX (Rendered when in table view OR at the bottom of grid view) */}
            <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs sm:text-sm font-bold text-[--color-ink-900]">
                  Supplier Performance Comparison Matrix
                </h2>
                <span className="text-xs text-[--color-ink-500]">
                  {filteredAndSortedSuppliers.length} records
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[620px]">
                  <thead>
                    <tr className="border-b border-[--color-border] text-left text-xs font-semibold text-[--color-ink-500] uppercase tracking-wider bg-[--color-surface-1]/40">
                      <th className="py-2.5 px-3">Supplier Name</th>
                      <th className="py-2.5 px-2">Primary Category</th>
                      <th className="py-2.5 px-2">Reliability Score</th>
                      <th className="py-2.5 px-2">On-Time Rate</th>
                      <th className="py-2.5 px-2">Average Lead Time</th>
                      <th className="py-2.5 px-2">Open Orders</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--color-border]">
                    {filteredAndSortedSuppliers.map((s, idx) => (
                      <tr
                        key={`supp-row-${s.id}-${idx}`}
                        className="hover:bg-[--color-surface-1]/70 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-semibold text-[--color-ink-900]">{s.name}</td>
                        <td className="py-2.5 px-2 text-[--color-ink-600]">{s.category}</td>
                        <td className="py-2.5 px-2 tabular font-bold text-[--color-ink-900]">
                          <span
                            className={
                              (s.reliabilityScore ?? 92) >= 95
                                ? "text-emerald-600 dark:text-emerald-400"
                                : (s.reliabilityScore ?? 92) >= 90
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-amber-600 dark:text-amber-400"
                            }
                          >
                            {s.reliabilityScore ?? 92} / 100
                          </span>
                        </td>
                        <td className="py-2.5 px-2 tabular text-[--color-ink-800]">{s.onTimeDeliveryRate ?? 95}%</td>
                        <td className="py-2.5 px-2 tabular text-[--color-ink-800]">{s.avgLeadTimeDays ?? 7} days</td>
                        <td className="py-2.5 px-2 tabular text-[--color-ink-800]">{s.openOrders ?? 0}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedSupplier(s)}
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              View
                            </button>
                            <span className="text-[--color-ink-300]">·</span>
                            <button
                              onClick={() => openEditModal(s)}
                              className="text-xs font-semibold text-[--color-ink-600] hover:text-[--color-ink-900] hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* SUPPLIER DETAILS DRAWER */}
      {selectedSupplier ? (
        <SupplierDetailDrawer
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          onEdit={() => {
            const s = selectedSupplier;
            setSelectedSupplier(null);
            openEditModal(s);
          }}
        />
      ) : null}

      {/* EDIT SUPPLIER MODAL */}
      {editingSupplier ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
          onClick={() => setEditingSupplier(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-[--color-border] bg-[--color-surface-0] p-5 sm:p-6 shadow-2xl text-xs space-y-4 text-[--color-ink-900]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-[--color-border] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[--color-ink-900]">Edit Supplier Details</h3>
                <p className="text-xs text-[--color-ink-500] mt-0.5">{editingSupplier.name}</p>
              </div>
              <button
                onClick={() => setEditingSupplier(null)}
                className="rounded-lg p-1 text-[--color-ink-400] hover:text-[--color-ink-700] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[--color-ink-700] mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[--color-ink-700] mb-1">Primary Category</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Brake Systems, Transmission Spares"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[--color-ink-700] mb-1">Supplier Address</label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                  placeholder="Street / Industrial Area, City, State, PIN"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[--color-ink-700] mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editContactName}
                    onChange={(e) => setEditContactName(e.target.value)}
                    className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[--color-ink-700] mb-1">Avg Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={editLeadTime}
                    onChange={(e) => setEditLeadTime(Number(e.target.value))}
                    className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[--color-ink-700] mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[--color-ink-700] mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[--color-ink-700] mb-1">Reliability Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editReliability}
                    onChange={(e) => setEditReliability(Number(e.target.value))}
                    className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[--color-ink-700] mb-1">On-Time Rate % (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editOnTime}
                    onChange={(e) => setEditOnTime(Number(e.target.value))}
                    className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[--color-border]">
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3.5 py-2 text-xs font-semibold text-[--color-ink-700] hover:bg-[--color-surface-2] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingSupplier}
                onClick={handleSaveSupplier}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {savingSupplier ? "Saving…" : "Save Details"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between border-b border-[--color-border] pb-1 last:border-0">
      <span className="text-[--color-ink-500] font-normal">{label}</span>
      <span
        className={`tabular font-semibold ${
          highlight ? "text-emerald-600 dark:text-emerald-400" : "text-[--color-ink-900]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SupplierDetailDrawer({
  supplier,
  onClose,
  onEdit,
}: {
  supplier: Supplier;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    getPurchaseOrders().then((pos) => setPurchaseOrders(pos.filter((po) => po.supplier === supplier.name)));
    getPriceHistory(supplier.name).then(setPriceHistory);
  }, [supplier.name]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="h-full w-full sm:max-w-md overflow-y-auto border-l border-[--color-border] bg-[--color-surface-0] p-5 sm:p-6 space-y-4 shadow-xl text-[--color-ink-900]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[--color-border] pb-3">
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{supplier.category}</p>
            <h2 className="text-base font-bold text-[--color-ink-900] mt-0.5">{supplier.name}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-lg border border-[--color-border] bg-[--color-surface-1] px-2.5 py-1 text-xs font-semibold text-[--color-ink-700] hover:text-[--color-ink-900] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
            >
              <Pencil size={12} />
              <span>Edit</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[--color-ink-400] hover:text-[--color-ink-700] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-[--color-border] bg-[--color-surface-1] p-2.5">
            <p className="text-[11px] text-[--color-ink-500] font-medium">Reliability Rating</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">{supplier.reliabilityScore ?? 92}/100</p>
          </div>
          <div className="rounded-lg border border-[--color-border] bg-[--color-surface-1] p-2.5">
            <p className="text-[11px] text-[--color-ink-500] font-medium">On-Time Delivery</p>
            <p className="text-sm font-bold text-[--color-ink-900] mt-0.5">{supplier.onTimeDeliveryRate ?? 95}%</p>
          </div>
          <div className="rounded-lg border border-[--color-border] bg-[--color-surface-1] p-2.5">
            <p className="text-[11px] text-[--color-ink-500] font-medium">Avg Lead Time</p>
            <p className="text-xs font-bold text-[--color-ink-900] mt-0.5">{supplier.avgLeadTimeDays ?? 7} days</p>
          </div>
          <div className="rounded-lg border border-[--color-border] bg-[--color-surface-1] p-2.5">
            <p className="text-[11px] text-[--color-ink-500] font-medium">Open Orders</p>
            <p className="text-xs font-bold text-[--color-ink-900] mt-0.5">{supplier.openOrders ?? 0}</p>
          </div>
        </div>

        {/* CONTACT INFO */}
        <div className="rounded-lg border border-[--color-border] bg-[--color-surface-1] p-3 text-xs space-y-2">
          <p className="font-bold text-[--color-ink-900] text-xs mb-1">Contact & Address</p>
          {supplier.address ? (
            <div className="flex items-start gap-2 text-[--color-ink-700]">
              <MapPin size={13} className="text-[--color-ink-400] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{supplier.address}</span>
            </div>
          ) : null}
          {supplier.contactName ? (
            <p className="text-[--color-ink-700] text-xs font-medium">Officer: {supplier.contactName}</p>
          ) : null}
          {supplier.contactEmail ? (
            <div className="flex items-center gap-2 text-[--color-ink-700]">
              <Mail size={13} className="text-[--color-ink-400] shrink-0" /> {supplier.contactEmail}
            </div>
          ) : null}
          {supplier.contactPhone ? (
            <div className="flex items-center gap-2 text-[--color-ink-700]">
              <Phone size={13} className="text-[--color-ink-400] shrink-0" /> {supplier.contactPhone}
            </div>
          ) : null}
        </div>

        {/* PURCHASE ORDERS ASSOCIATED */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[--color-ink-900]">Associated Purchase Orders ({purchaseOrders.length})</p>
          {purchaseOrders.length === 0 ? (
            <p className="text-xs text-[--color-ink-500]">No purchase orders recorded for this supplier.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {purchaseOrders.map((po) => (
                <div key={po.poNumber} className="rounded-lg border border-[--color-border] bg-[--color-surface-1] p-2 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-[--color-ink-900]">{po.poNumber}</span>
                    <span className="text-[--color-ink-500] ml-2">{po.poDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular font-medium text-[--color-ink-900]">₹{po.total.toLocaleString("en-IN")}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200">
                      {po.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRICE HISTORY */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[--color-ink-900]">Recent Quoted Prices ({priceHistory.length})</p>
          {priceHistory.length === 0 ? (
            <p className="text-xs text-[--color-ink-500]">No price records available.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {priceHistory.map((pr, idx) => (
                <div key={idx} className="rounded-lg border border-[--color-border] bg-[--color-surface-1] p-2 text-xs flex justify-between items-center">
                  <span className="text-[--color-ink-600]">{pr.date}</span>
                  <span className="tabular font-semibold text-[--color-ink-900]">₹{pr.unitPrice.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
