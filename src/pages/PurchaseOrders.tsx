import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, PackageCheck, XCircle, Plus, X, FileText } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { LoadingState, ErrorState } from "../components/ui/States";
import { StatusBadge } from "../components/ui/StatusBadge";
import { getPurchaseOrders, updatePoStatus } from "../services/purchaseOrderApi";
import { PurchaseOrderPdfModal } from "../components/ui/PurchaseOrderPdfModal";
import type { PurchaseOrder, PoStatus } from "../types";

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null);
  const [pdfPo, setPdfPo] = useState<PurchaseOrder | null>(null);

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

  return (
    <div>
      <TopBar title="Purchase Orders" subtitle="What did we order? — Purchase order lifecycle management" />

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-end">
          <button
            onClick={() => navigate("/purchase-orders/new")}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer w-full sm:w-auto"
          >
            <Plus size={16} /> Create New PO
          </button>
        </div>

        {loading ? (
          <LoadingState label="Loading purchase order records…" />
        ) : error ? (
          <ErrorState title="Purchase orders unavailable." message={error} onRetry={load} />
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[--color-border] bg-[--color-surface-0] p-8 text-center sm:p-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Plus size={24} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[--color-ink-900]">No purchase orders recorded yet</h3>
              <p className="mt-1 max-w-md text-xs text-[--color-ink-500]">
                Create a new purchase order manually or populate from PuLP optimization recommendations or critical low-stock alerts.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => navigate("/purchase-orders/new")}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={16} /> Create New PO
              </button>
              <button
                onClick={() => navigate("/procurement")}
                className="flex items-center gap-2 rounded-lg border border-[--color-border] bg-[--color-surface-0] px-4 py-2 text-sm font-medium text-[--color-ink-700] hover:bg-[--color-surface-1] transition-all cursor-pointer"
              >
                Run PuLP Optimizer
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-[--color-border] text-left text-xs uppercase tracking-wide text-[--color-ink-500]">
                    <th className="px-4 py-2.5">PO Number</th>
                    <th className="px-2 py-2.5">Supplier</th>
                    <th className="px-2 py-2.5">PO Date</th>
                    <th className="px-2 py-2.5">Expected Delivery</th>
                    <th className="px-2 py-2.5">Total Amount</th>
                    <th className="px-2 py-2.5">Status</th>
                    <th className="px-2 py-2.5 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((po) => (
                    <tr key={po.poNumber} className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-1]">
                      <td className="px-4 py-2.5 font-medium text-[--color-ink-900]">{po.poNumber}</td>
                      <td className="px-2 py-2.5 text-[--color-ink-700]">{po.supplier}</td>
                      <td className="px-2 py-2.5">{po.poDate}</td>
                      <td className="px-2 py-2.5">{po.expectedDelivery}</td>
                      <td className="tabular px-2 py-2.5 font-semibold">₹{po.total.toLocaleString("en-IN")}</td>
                      <td className="px-2 py-2.5">
                        <StatusBadge label={po.status} />
                      </td>
                      <td className="px-3 py-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewing(po)}
                            title="View PO Details"
                            className="inline-flex items-center justify-center rounded-md border border-[--color-border] bg-[--color-surface-2] p-1.5 text-[--color-ink-700] hover:text-[--color-ink-900] hover:border-[--color-border-strong] active:scale-95 transition-all cursor-pointer shadow-2xs"
                            aria-label="View Details"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            onClick={() => setPdfPo(po)}
                            title="View & Print Official PDF"
                            className="inline-flex items-center justify-center rounded-md border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 active:scale-95 transition-all cursor-pointer shadow-2xs"
                            aria-label="View PDF"
                          >
                            <FileText size={15} />
                          </button>

                          {["Ordered", "Approved", "Partially Received"].includes(po.status) && (
                            <button
                              onClick={() => handleStatusChange(po.poNumber, "Received")}
                              title="Click to receive shipment and update inventory stock"
                              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/60 bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer"
                            >
                              <PackageCheck size={14} className="stroke-[2.5]" />
                              <span>Receive Stock</span>
                            </button>
                          )}

                          {!["Received", "Closed", "Cancelled"].includes(po.status) && (
                            <button
                              onClick={() => handleStatusChange(po.poNumber, "Cancelled")}
                              title="Cancel Purchase Order"
                              className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 hover:text-red-300 active:scale-95 transition-all cursor-pointer"
                              aria-label="Cancel Order"
                            >
                              <XCircle size={15} />
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-2xl text-sm space-y-4 text-slate-900 dark:text-zinc-100"
            style={{ backgroundColor: "#ffffff" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-zinc-800 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    {viewing.poNumber}
                  </span>
                  <StatusBadge label={viewing.status} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 leading-tight">
                  {viewing.supplier}
                </h3>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Metadata Badges */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/80 p-2.5">
                <span className="text-slate-500 dark:text-zinc-400 block mb-0.5 font-medium">PO Date</span>
                <span className="font-semibold text-slate-900 dark:text-zinc-100">{viewing.poDate}</span>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/80 p-2.5">
                <span className="text-slate-500 dark:text-zinc-400 block mb-0.5 font-medium">Expected Delivery</span>
                <span className="font-semibold text-slate-900 dark:text-zinc-100">{viewing.expectedDelivery}</span>
              </div>
            </div>

            {viewing.notes ? (
              <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/80 p-3 text-xs text-slate-700 dark:text-zinc-300">
                <span className="font-semibold text-slate-900 dark:text-zinc-100 block mb-0.5">Order Notes:</span>
                {viewing.notes}
              </div>
            ) : null}

            {/* Line Items */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[--color-ink-500] mb-2">
                Order Line Items ({viewing.lines.length})
              </p>
              <div className="space-y-2 border border-[--color-border] rounded-xl p-3 bg-[--color-surface-1]">
                {viewing.lines.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-[--color-border]/60 last:border-0 pb-2 last:pb-0 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-[--color-ink-900] truncate">{l.part}</p>
                      <p className="text-[--color-ink-500]">
                        {l.quantity} units × ₹{l.unitPrice.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <span className="tabular font-bold text-[--color-ink-900] shrink-0">
                      ₹{l.totalCost.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Order Value */}
            <div className="flex items-center justify-between border-t border-[--color-border] pt-3 text-sm">
              <span className="font-medium text-[--color-ink-700]">Total Order Value</span>
              <span className="tabular text-lg font-bold text-blue-400">
                ₹{viewing.total.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[--color-border]">
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-lg border border-[--color-border] bg-[--color-surface-2] px-4 py-2 text-xs font-semibold text-[--color-ink-700] hover:bg-[--color-surface-1] hover:text-[--color-ink-900] transition-colors cursor-pointer"
              >
                Close
              </button>

              {viewing.status === "Submitted" && (
                <button
                  onClick={() => {
                    handleStatusChange(viewing.poNumber, "Approved");
                    setViewing(null);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
                >
                  Approve PO
                </button>
              )}

              {viewing.status === "Approved" && (
                <button
                  onClick={() => {
                    handleStatusChange(viewing.poNumber, "Ordered");
                    setViewing(null);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
                >
                  Mark as Ordered
                </button>
              )}

              <button
                onClick={() => setPdfPo(viewing)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-200 shadow-xs hover:bg-slate-50 dark:hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer"
              >
                <FileText size={14} className="text-blue-600 dark:text-blue-400" />
                <span>View & Print PDF</span>
              </button>

              {["Ordered", "Approved", "Partially Received"].includes(viewing.status) && (
                <button
                  onClick={() => {
                    handleStatusChange(viewing.poNumber, "Received");
                    setViewing(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer border border-emerald-500"
                >
                  <PackageCheck size={15} />
                  <span>Receive PO & Update Inventory</span>
                </button>
              )}
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
