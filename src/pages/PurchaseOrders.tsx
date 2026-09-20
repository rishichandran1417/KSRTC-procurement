import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, PackageCheck, XCircle, Plus } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";
import { StatusBadge } from "../components/ui/StatusBadge";
import { getPurchaseOrders, updatePoStatus } from "../services/purchaseOrderApi";
import type { PurchaseOrder, PoStatus } from "../types";

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null);

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

      <div className="p-6">
        <div className="mb-4 flex items-center justify-end">
          <button
            onClick={() => navigate("/purchase-orders/new")}
            className="flex items-center gap-1.5 rounded bg-[--color-forecast-500] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-[--color-forecast-700]"
          >
            <Plus size={16} /> Create New PO
          </button>
        </div>

        {loading ? (
          <LoadingState label="Loading purchase order records…" />
        ) : error ? (
          <ErrorState title="Purchase orders unavailable." message={error} onRetry={load} />
        ) : orders.length === 0 ? (
          <EmptyState title="No purchase orders recorded yet" message="Run PuLP optimization or click Create New PO." />
        ) : (
          <div className="overflow-hidden rounded-md border border-[--color-border] bg-[--color-surface-0]">
            <table className="w-full text-sm">
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
                    <td className="px-2 py-2.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewing(po)}
                          title="View Details"
                          className="rounded p-1 text-[--color-ink-600] hover:bg-[--color-surface-2]"
                        >
                          <Eye size={15} />
                        </button>

                        {["Ordered", "Approved", "Partially Received"].includes(po.status) && (
                          <button
                            onClick={() => handleStatusChange(po.poNumber, "Received")}
                            title="Receive Shipment & Update Inventory"
                            className="flex items-center gap-1 rounded bg-[--color-healthy-500]/10 px-2 py-1 text-xs font-medium text-[--color-healthy-500] hover:bg-[--color-healthy-500]/20"
                          >
                            <PackageCheck size={14} /> Receive Stock
                          </button>
                        )}

                        {!["Received", "Closed", "Cancelled"].includes(po.status) && (
                          <button
                            onClick={() => handleStatusChange(po.poNumber, "Cancelled")}
                            title="Cancel Order"
                            className="rounded p-1 text-[--color-critical-500] hover:bg-[--color-surface-2]"
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
        )}
      </div>

      {/* PO DETAIL VIEW MODAL */}
      {viewing ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-lg rounded-md border border-[--color-border] bg-[--color-surface-0] p-6 shadow-xl text-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b border-[--color-border] pb-3 mb-3">
              <div>
                <p className="text-xs font-bold text-[--color-forecast-600]">{viewing.poNumber}</p>
                <h3 className="text-base font-bold text-[--color-ink-900]">{viewing.supplier}</h3>
              </div>
              <StatusBadge label={viewing.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div><span className="text-[--color-ink-500]">PO Date:</span> {viewing.poDate}</div>
              <div><span className="text-[--color-ink-500]">Expected:</span> {viewing.expectedDelivery}</div>
            </div>

            {viewing.notes ? (
              <p className="mb-3 rounded border border-[--color-border] bg-[--color-surface-1] p-2 text-xs text-[--color-ink-600]">
                {viewing.notes}
              </p>
            ) : null}

            <p className="text-xs font-semibold uppercase text-[--color-ink-500] mb-2">Order Line Items</p>
            <div className="space-y-1.5 text-xs border border-[--color-border] rounded p-3 bg-[--color-surface-1]">
              {viewing.lines.map((l, i) => (
                <div key={i} className="flex justify-between border-b border-[--color-border] last:border-0 py-1">
                  <div>
                    <span className="font-semibold text-[--color-ink-900]">{l.part}</span>
                    <span className="text-[--color-ink-500]"> × {l.quantity} units @ ₹{l.unitPrice}</span>
                  </div>
                  <span className="tabular font-bold">₹{l.totalCost.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[--color-border] pt-3 font-semibold">
              <span>Total Order Value</span>
              <span className="tabular text-base font-bold text-[--color-forecast-600]">₹{viewing.total.toLocaleString("en-IN")}</span>
            </div>

            {/* LIFECYCLE ACTION BUTTONS IN MODAL */}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {viewing.status === "Submitted" && (
                <button
                  onClick={() => handleStatusChange(viewing.poNumber, "Approved")}
                  className="rounded bg-[--color-forecast-500] px-3 py-1 text-xs text-white hover:bg-[--color-forecast-700]"
                >
                  Approve PO
                </button>
              )}
              {viewing.status === "Approved" && (
                <button
                  onClick={() => handleStatusChange(viewing.poNumber, "Ordered")}
                  className="rounded bg-[--color-forecast-500] px-3 py-1 text-xs text-white hover:bg-[--color-forecast-700]"
                >
                  Mark as Ordered
                </button>
              )}
              {["Ordered", "Approved", "Partially Received"].includes(viewing.status) && (
                <button
                  onClick={() => handleStatusChange(viewing.poNumber, "Received")}
                  className="rounded bg-[--color-healthy-500] px-3 py-1 text-xs text-white hover:bg-[--color-healthy-700]"
                >
                  Receive PO & Update Inventory Stock
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
