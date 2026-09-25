import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, PackageCheck, XCircle, Plus, X, FileText, Pencil, Trash2,
  Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Sparkles, MapPin
} from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";
import { StatusBadge } from "../components/ui/StatusBadge";
import { getPurchaseOrders, updatePoStatus, updatePurchaseOrder } from "../services/purchaseOrderApi";
import { PurchaseOrderPdfModal } from "../components/ui/PurchaseOrderPdfModal";
import type { PurchaseOrder, PoStatus } from "../types";

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null);
  const [pdfPo, setPdfPo] = useState<PurchaseOrder | null>(null);

  // Search, filter, sort and pagination states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortField, setSortField] = useState<"poDate" | "poNumber" | "supplier" | "expectedDelivery" | "total" | "status">("poDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Edit PO state
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);
  const [editSupplier, setEditSupplier] = useState("");
  const [editSupplierAddress, setEditSupplierAddress] = useState("");
  const [editExpectedDelivery, setEditExpectedDelivery] = useState("");
  const [editStatus, setEditStatus] = useState<PoStatus>("Submitted");
  const [editNotes, setEditNotes] = useState("");
  const [editLines, setEditLines] = useState<{ part: string; quantity: number; unitPrice: number; totalCost: number }[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    getPurchaseOrders()
      .then(setOrders)
      .catch(() => setError("Could not load purchase orders from the database."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleStatusChange = (poNumber: string, nextStatus: PoStatus) => {
    updatePoStatus(poNumber, nextStatus).then((updated) => {
      setOrders((prev) => prev.map((o) => (o.poNumber === poNumber ? updated : o)));
      if (viewing && viewing.poNumber === poNumber) setViewing(updated);
    });
  };

  const openEditModal = (po: PurchaseOrder) => {
    setEditingPo(po);
    setEditSupplier(po.supplier || "");
    setEditSupplierAddress(po.supplierAddress || "");
    setEditExpectedDelivery(po.expectedDelivery || "");
    setEditStatus(po.status || "Submitted");
    setEditNotes(po.notes || "");
    setEditLines(
      po.lines && po.lines.length > 0
        ? po.lines.map((l) => ({ ...l }))
        : [{ part: "Spare Part", quantity: 1, unitPrice: 0, totalCost: 0 }]
    );
  };

  const handleLineChange = (index: number, field: "part" | "quantity" | "unitPrice", value: string | number) => {
    setEditLines((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      item.totalCost = qty * price;
      updated[index] = item;
      return updated;
    });
  };

  const addLine = () => {
    setEditLines((prev) => [...prev, { part: "", quantity: 1, unitPrice: 0, totalCost: 0 }]);
  };

  const removeLine = (index: number) => {
    if (editLines.length <= 1) return;
    setEditLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    if (!editingPo) return;
    setSavingEdit(true);
    try {
      const calculatedTotal = editLines.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        0
      );
      const updated: PurchaseOrder = {
        ...editingPo,
        supplier: editSupplier.trim() || editingPo.supplier,
        supplierAddress: editSupplierAddress.trim() || undefined,
        expectedDelivery: editExpectedDelivery || editingPo.expectedDelivery,
        status: editStatus,
        notes: editNotes.trim(),
        lines: editLines.map((l) => ({
          part: l.part.trim() || "Item",
          quantity: Number(l.quantity) || 1,
          unitPrice: Number(l.unitPrice) || 0,
          totalCost: (Number(l.quantity) || 1) * (Number(l.unitPrice) || 0),
        })),
        total: calculatedTotal,
      };

      await updatePurchaseOrder(updated);
      setOrders((prev) => prev.map((p) => (p.poNumber === updated.poNumber ? updated : p)));
      if (viewing && viewing.poNumber === updated.poNumber) {
        setViewing(updated);
      }
      setEditingPo(null);
    } catch (e) {
      console.error("Failed to update PO:", e);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      if (field === "poDate" || field === "poNumber" || field === "total" || field === "expectedDelivery") {
        setSortDirection("desc");
      } else {
        setSortDirection("asc");
      }
    }
    setCurrentPage(1);
  };

  const sortedAndFilteredOrders = useMemo(() => {
    let list = orders.filter((po) => {
      if (statusFilter !== "All" && po.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNumber = (po.poNumber || "").toLowerCase().includes(q);
        const matchSupplier = (po.supplier || "").toLowerCase().includes(q);
        const matchNotes = (po.notes || "").toLowerCase().includes(q);
        const matchPart = po.lines?.some((l) => (l.part || "").toLowerCase().includes(q));
        if (!matchNumber && !matchSupplier && !matchNotes && !matchPart) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "poNumber": {
          const numA = parseInt(a.poNumber.match(/(\d+)/g)?.pop() || "0", 10);
          const numB = parseInt(b.poNumber.match(/(\d+)/g)?.pop() || "0", 10);
          if (numA && numB && numA !== numB) {
            cmp = numA - numB;
          } else {
            cmp = (a.poNumber || "").localeCompare(b.poNumber || "");
          }
          break;
        }
        case "supplier":
          cmp = (a.supplier || "").localeCompare(b.supplier || "");
          break;
        case "poDate": {
          const dateA = new Date(a.poDate).getTime() || 0;
          const dateB = new Date(b.poDate).getTime() || 0;
          cmp = dateA - dateB;
          if (cmp === 0) {
            const numA = parseInt(a.poNumber.match(/(\d+)/g)?.pop() || "0", 10);
            const numB = parseInt(b.poNumber.match(/(\d+)/g)?.pop() || "0", 10);
            cmp = numA - numB;
          }
          break;
        }
        case "expectedDelivery": {
          const dateA = new Date(a.expectedDelivery).getTime() || 0;
          const dateB = new Date(b.expectedDelivery).getTime() || 0;
          cmp = dateA - dateB;
          break;
        }
        case "total":
          cmp = (a.total || 0) - (b.total || 0);
          break;
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "");
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [orders, search, statusFilter, sortField, sortDirection]);

  const totalItems = sortedAndFilteredOrders.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = pageSize === -1 ? 0 : (safeCurrentPage - 1) * pageSize;
  const paginatedOrders =
    pageSize === -1
      ? sortedAndFilteredOrders
      : sortedAndFilteredOrders.slice(startIdx, startIdx + pageSize);

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

  const renderSortHeader = (label: string, field: typeof sortField, className = "") => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`cursor-pointer py-2.5 px-3 transition-colors hover:text-blue-600 dark:hover:text-blue-400 group select-none ${
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
      <TopBar title="Purchase Orders" subtitle="What did we order? — Purchase order lifecycle management" />

      <div className="p-4 sm:p-6 space-y-4">
        {/* TOOLBAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <input
                placeholder="Search PO #, supplier, part…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md border border-[--color-border] bg-[--color-surface-0] pl-8 pr-3 py-1.5 text-xs text-[--color-ink-900] placeholder:text-[--color-ink-400] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-[--color-ink-400]" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-md border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-xs text-[--color-ink-800] focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Ordered">Ordered</option>
              <option value="Partially Received">Partially Received</option>
              <option value="Received">Received</option>
              <option value="Delayed">Delayed</option>
              <option value="Closed">Closed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[--color-ink-500] hidden sm:inline">Sort:</span>
              <select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [f, d] = e.target.value.split("-") as [typeof sortField, typeof sortDirection];
                  setSortField(f);
                  setSortDirection(d);
                  setCurrentPage(1);
                }}
                className="rounded-md border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-xs text-[--color-ink-800] focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="poDate-desc">PO Date (Newest First)</option>
                <option value="poDate-asc">PO Date (Oldest First)</option>
                <option value="poNumber-desc">PO Number (Newest / Desc)</option>
                <option value="poNumber-asc">PO Number (Oldest / Asc)</option>
                <option value="total-desc">Total Amount (High → Low)</option>
                <option value="total-asc">Total Amount (Low → High)</option>
                <option value="supplier-asc">Supplier (A → Z)</option>
                <option value="supplier-desc">Supplier (Z → A)</option>
                <option value="status-asc">Status</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => navigate("/purchase-orders/new")}
            className="flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer w-full sm:w-auto"
          >
            <Plus size={14} /> Create New PO
          </button>
        </div>

        {loading ? (
          <LoadingState label="Loading purchase order records…" />
        ) : error ? (
          <ErrorState title="Purchase orders unavailable." message={error} onRetry={load} />
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[--color-border] bg-[--color-surface-0] p-8 text-center sm:p-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[--color-ink-900]">No purchase orders recorded yet</h3>
              <p className="mt-1 max-w-md text-xs text-[--color-ink-500]">
                Create a new purchase order manually or populate from PuLP optimization recommendations or critical low-stock alerts.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <button
                onClick={() => navigate("/purchase-orders/new")}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
              >
                <Plus size={14} /> Create New PO
              </button>
              <button
                onClick={() => navigate("/procurement")}
                className="flex items-center gap-1.5 rounded-md border border-[--color-border] bg-[--color-surface-0] px-3.5 py-1.5 text-xs font-medium text-[--color-ink-700] hover:bg-[--color-surface-1] transition-all cursor-pointer"
              >
                Run PuLP Optimizer
              </button>
            </div>
          </div>
        ) : sortedAndFilteredOrders.length === 0 ? (
          <EmptyState
            title="No matching purchase orders"
            message="No orders matched your search or status filter. Try clearing the search term or selecting 'All Statuses'."
          />
        ) : (
          <div className="rounded-lg border border-[--color-border] bg-[--color-surface-0] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[680px]">
                <thead>
                  <tr className="border-b border-[--color-border] bg-[--color-surface-1]/60 text-left text-xs font-medium text-[--color-ink-500]">
                    {renderSortHeader("PO Number", "poNumber", "px-4")}
                    {renderSortHeader("Supplier", "supplier", "px-3")}
                    {renderSortHeader("PO Date", "poDate", "px-3")}
                    {renderSortHeader("Expected Delivery", "expectedDelivery", "px-3")}
                    {renderSortHeader("Total Amount", "total", "px-3")}
                    {renderSortHeader("Status", "status", "px-3")}
                    <th className="px-3 py-2.5 text-right pr-4 text-[--color-ink-500] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--color-border]">
                  {paginatedOrders.map((po, idx) => (
                    <tr
                      key={`po-list-${po.poNumber}-${idx}`}
                      className={`hover:bg-[--color-surface-1] transition-colors ${
                        po.isNew ? "bg-blue-500/5 dark:bg-blue-500/10" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium text-[--color-ink-900]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{po.poNumber}</span>
                          {po.isNew && (
                            <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/30">
                              <Sparkles size={10} className="text-blue-500" />
                              NEW
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[--color-ink-700]">{po.supplier}</td>
                      <td className="px-3 py-2.5 text-[--color-ink-600]">{po.poDate}</td>
                      <td className="px-3 py-2.5 text-[--color-ink-600]">{po.expectedDelivery}</td>
                      <td className="tabular px-3 py-2.5 font-semibold text-[--color-ink-900]">
                        ₹{po.total.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge label={po.status} />
                      </td>
                      <td className="px-3 py-2.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewing(po)}
                            title="View PO Details"
                            className="inline-flex items-center justify-center rounded border border-[--color-border] bg-[--color-surface-1] p-1.5 text-[--color-ink-600] hover:text-[--color-ink-900] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
                            aria-label="View Details"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            onClick={() => openEditModal(po)}
                            title="Edit PO Details"
                            className="inline-flex items-center justify-center rounded border border-[--color-border] bg-[--color-surface-1] p-1.5 text-[--color-ink-600] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-[--color-surface-2] transition-colors cursor-pointer"
                            aria-label="Edit Order Details"
                          >
                            <Pencil size={13} />
                          </button>

                          <button
                            onClick={() => setPdfPo(po)}
                            title="View & Print Official PDF"
                            className="inline-flex items-center justify-center rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                            aria-label="View PDF"
                          >
                            <FileText size={13} />
                          </button>

                          {["Ordered", "Approved", "Partially Received"].includes(po.status) && (
                            <button
                              onClick={() => handleStatusChange(po.poNumber, "Received")}
                              title="Click to receive shipment and update inventory stock"
                              className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            >
                              <PackageCheck size={13} />
                              <span>Receive</span>
                            </button>
                          )}

                          {!["Received", "Closed", "Cancelled"].includes(po.status) && (
                            <button
                              onClick={() => handleStatusChange(po.poNumber, "Cancelled")}
                              title="Cancel Purchase Order"
                              className="inline-flex items-center justify-center rounded border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                              aria-label="Cancel Order"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
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
                  <strong className="text-[--color-ink-900]">{totalItems.toLocaleString("en-IN")}</strong> purchase orders
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
                    <option value={200}>200</option>
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

      {/* PO DETAIL VIEW MODAL */}
      {viewing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-[--color-border] bg-[--color-surface-0] p-5 shadow-xl text-xs space-y-4 text-[--color-ink-900]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[--color-border] pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                    {viewing.poNumber}
                  </span>
                  <StatusBadge label={viewing.status} />
                </div>
                <h3 className="text-base font-medium text-[--color-ink-900] leading-tight">
                  {viewing.supplier}
                </h3>
                {viewing.supplierAddress && (
                  <p className="text-xs text-[--color-ink-500] flex items-center gap-1 mt-0.5">
                    <MapPin size={11} className="text-blue-500 shrink-0" />
                    <span>{viewing.supplierAddress}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setViewing(null)}
                className="rounded p-1 text-[--color-ink-400] hover:text-[--color-ink-700] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Metadata Badges */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2.5">
                <span className="text-[--color-ink-500] block mb-0.5 font-normal">PO Date</span>
                <span className="font-medium text-[--color-ink-900]">{viewing.poDate}</span>
              </div>
              <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2.5">
                <span className="text-[--color-ink-500] block mb-0.5 font-normal">Expected Delivery</span>
                <span className="font-medium text-[--color-ink-900]">{viewing.expectedDelivery}</span>
              </div>
            </div>

            {viewing.notes ? (
              <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2.5 text-xs text-[--color-ink-700]">
                <span className="font-medium text-[--color-ink-900] block mb-0.5">Order Notes:</span>
                {viewing.notes}
              </div>
            ) : null}

            {/* Line Items */}
            <div>
              <p className="text-xs font-medium text-[--color-ink-500] mb-2">
                Order Line Items ({viewing.lines?.length || 0})
              </p>
              <div className="space-y-1.5 border border-[--color-border] rounded-md p-2.5 bg-[--color-surface-1]">
                {viewing.lines && viewing.lines.length > 0 ? (
                  viewing.lines.map((l, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b border-[--color-border] last:border-0 pb-1.5 last:pb-0 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-[--color-ink-900] truncate">{l.part}</p>
                        <p className="text-[--color-ink-500]">
                          {l.quantity} units × ₹{l.unitPrice.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <span className="tabular font-medium text-[--color-ink-900] shrink-0">
                        ₹{l.totalCost.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[--color-ink-400]">No itemized lines recorded.</p>
                )}
              </div>
            </div>

            {/* Total Order Value */}
            <div className="flex items-center justify-between border-t border-[--color-border] pt-3 text-xs">
              <span className="font-normal text-[--color-ink-600]">Total Order Value</span>
              <span className="tabular text-sm font-semibold text-blue-600 dark:text-blue-400">
                ₹{viewing.total.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[--color-border]">
              <button
                type="button"
                onClick={() => {
                  const poToEdit = viewing;
                  setViewing(null);
                  openEditModal(poToEdit);
                }}
                className="inline-flex items-center gap-1.5 rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-medium text-[--color-ink-700] hover:bg-[--color-surface-2] hover:text-[--color-ink-900] transition-colors cursor-pointer"
              >
                <Pencil size={13} />
                <span>Edit Order</span>
              </button>

              <button
                onClick={() => setPdfPo(viewing)}
                className="inline-flex items-center gap-1.5 rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-zinc-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <FileText size={13} className="text-blue-600 dark:text-blue-400" />
                <span>Print PDF</span>
              </button>

              {viewing.status === "Submitted" && (
                <button
                  onClick={() => {
                    handleStatusChange(viewing.poNumber, "Approved");
                    setViewing(null);
                  }}
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Approve PO
                </button>
              )}

              {["Ordered", "Approved", "Partially Received"].includes(viewing.status) && (
                <button
                  onClick={() => {
                    handleStatusChange(viewing.poNumber, "Received");
                    setViewing(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <PackageCheck size={14} />
                  <span>Receive PO</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded border border-[--color-border] bg-[--color-surface-2] px-3 py-1.5 text-xs font-normal text-[--color-ink-700] hover:bg-[--color-surface-1] hover:text-[--color-ink-900] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* EDIT PO MODAL */}
      {editingPo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
          onClick={() => setEditingPo(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-[--color-border] bg-[--color-surface-0] p-5 shadow-xl text-xs space-y-4 text-[--color-ink-900]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-[--color-border] pb-3">
              <div>
                <h3 className="text-sm font-medium text-[--color-ink-900]">Edit Purchase Order</h3>
                <p className="text-xs text-[--color-ink-500] font-mono mt-0.5">{editingPo.poNumber}</p>
              </div>
              <button
                onClick={() => setEditingPo(null)}
                className="rounded p-1 text-[--color-ink-400] hover:text-[--color-ink-700] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[--color-ink-700] mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={editSupplier}
                  onChange={(e) => setEditSupplier(e.target.value)}
                  className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. Ashok Leyland OEM Spares"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[--color-ink-700] mb-1">Supplier Address</label>
                <input
                  type="text"
                  value={editSupplierAddress}
                  onChange={(e) => setEditSupplierAddress(e.target.value)}
                  className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. Industrial Development Area, Kochuveli, Thiruvananthapuram - 695021"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[--color-ink-700] mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={editExpectedDelivery}
                    onChange={(e) => setEditExpectedDelivery(e.target.value)}
                    className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[--color-ink-700] mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as PoStatus)}
                    className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Approved">Approved</option>
                    <option value="Ordered">Ordered</option>
                    <option value="Received">Received</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[--color-ink-700] mb-1">Order Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="Add notes or delivery requirements..."
                />
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[--color-ink-700]">Line Items</label>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Add Item
                  </button>
                </div>

                <div className="space-y-2 border border-[--color-border] rounded-md p-2.5 bg-[--color-surface-1]">
                  {editLines.map((line, i) => (
                    <div key={i} className="flex items-center gap-2 border-b border-[--color-border] last:border-0 pb-2 last:pb-0">
                      <input
                        type="text"
                        value={line.part}
                        onChange={(e) => handleLineChange(i, "part", e.target.value)}
                        placeholder="Item description"
                        className="flex-1 rounded border border-[--color-border] bg-[--color-surface-0] px-2 py-1 text-xs text-[--color-ink-900]"
                      />
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleLineChange(i, "quantity", e.target.value)}
                        placeholder="Qty"
                        className="w-16 rounded border border-[--color-border] bg-[--color-surface-0] px-2 py-1 text-xs text-[--color-ink-900] text-center"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[--color-ink-500]">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => handleLineChange(i, "unitPrice", e.target.value)}
                          placeholder="Price"
                          className="w-20 rounded border border-[--color-border] bg-[--color-surface-0] px-2 py-1 text-xs text-[--color-ink-900] text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={editLines.length <= 1}
                        className="p-1 text-[--color-ink-400] hover:text-rose-500 disabled:opacity-30 cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex justify-between items-center text-xs px-1">
                  <span className="text-[--color-ink-500]">Calculated Total</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    ₹{editLines
                      .reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
                      .toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[--color-border]">
              <button
                type="button"
                onClick={() => setEditingPo(null)}
                className="rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-normal text-[--color-ink-700] hover:bg-[--color-surface-2] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="rounded bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pdfPo && (
        <PurchaseOrderPdfModal po={pdfPo} onClose={() => setPdfPo(null)} />
      )}
    </div>
  );
}
