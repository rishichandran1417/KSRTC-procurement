import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, PackageCheck, XCircle, Plus, X, FileText, Pencil, Trash2 } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { LoadingState, ErrorState } from "../components/ui/States";
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

  // Edit PO state
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);
  const [editSupplier, setEditSupplier] = useState("");
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

  return (
    <div>
      <TopBar title="Purchase Orders" subtitle="What did we order? — Purchase order lifecycle management" />

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-end">
          <button
            onClick={() => navigate("/purchase-orders/new")}
            className="flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition-all cursor-pointer w-full sm:w-auto"
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
        ) : (
          <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[640px]">
                <thead>
                  <tr className="border-b border-[--color-border] text-left text-xs font-medium text-[--color-ink-500]">
                    <th className="px-4 py-2.5">PO Number</th>
                    <th className="px-2 py-2.5">Supplier</th>
                    <th className="px-2 py-2.5">PO Date</th>
                    <th className="px-2 py-2.5">Expected Delivery</th>
                    <th className="px-2 py-2.5">Total Amount</th>
                    <th className="px-2 py-2.5">Status</th>
                    <th className="px-2 py-2.5 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--color-border]">
                  {orders.map((po, idx) => (
                    <tr key={`po-list-${po.poNumber}-${idx}`} className="hover:bg-[--color-surface-1] transition-colors">
                      <td className="px-4 py-2.5 font-medium text-[--color-ink-900]">{po.poNumber}</td>
                      <td className="px-2 py-2.5 text-[--color-ink-700]">{po.supplier}</td>
                      <td className="px-2 py-2.5 text-[--color-ink-600]">{po.poDate}</td>
                      <td className="px-2 py-2.5 text-[--color-ink-600]">{po.expectedDelivery}</td>
                      <td className="tabular px-2 py-2.5 font-medium text-[--color-ink-900]">₹{po.total.toLocaleString("en-IN")}</td>
                      <td className="px-2 py-2.5">
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
