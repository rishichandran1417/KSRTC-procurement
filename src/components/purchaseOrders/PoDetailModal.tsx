import React, { useState, useEffect } from "react";
import {
  X, MapPin, Pencil, FileText, PackageCheck, AlertTriangle,
  History, ShieldCheck, ClipboardList, Clock, Truck
} from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";
import {
  getGoodsReceipts,
  getDeliveryReschedules,
  getAuditLogs,
} from "../../services/purchaseOrderApi";
import type { PurchaseOrder, GoodsReceipt, PoDeliveryReschedule, PoAuditLog } from "../../types";

interface PoDetailModalProps {
  po: PurchaseOrder;
  onClose: () => void;
  onEditOrder: (po: PurchaseOrder) => void;
  onOpenReceive: (po: PurchaseOrder) => void;
  onOpenReschedule: (po: PurchaseOrder) => void;
  onPrintPdf: (po: PurchaseOrder) => void;
  onSubmitPo?: (po: PurchaseOrder) => void;
  onApprovePo?: (po: PurchaseOrder) => void;
  onOrderPo?: (po: PurchaseOrder) => void;
  onClosePo?: (po: PurchaseOrder) => void;
  onCancelPo?: (po: PurchaseOrder) => void;
}

export const PoDetailModal: React.FC<PoDetailModalProps> = ({
  po,
  onClose,
  onEditOrder,
  onOpenReceive,
  onOpenReschedule,
  onPrintPdf,
  onSubmitPo,
  onApprovePo,
  onOrderPo,
  onClosePo,
  onCancelPo,
}) => {
  const [activeTab, setActiveTab] = useState<"items" | "receipts" | "delivery" | "audit">("items");
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [reschedules, setReschedules] = useState<PoDeliveryReschedule[]>([]);
  const [auditLogs, setAuditLogs] = useState<PoAuditLog[]>([]);

  useEffect(() => {
    setReceipts(getGoodsReceipts(po.poNumber));
    setReschedules(getDeliveryReschedules(po.poNumber));
    setAuditLogs(getAuditLogs(po.poNumber));
  }, [po.poNumber]);

  // Calculate Overdue Status dynamically: Today > Expected Delivery AND Pending > 0
  const totalOrdered = po.lines?.reduce((s, l) => s + (Number(l.quantity) || 0), 0) || 0;
  const totalReceived = po.lines?.reduce((s, l) => s + (Number(l.receivedQuantity) || 0), 0) || 0;
  const totalRejected = po.lines?.reduce((s, l) => s + (Number(l.rejectedQuantity) || 0), 0) || 0;
  const pendingQuantity = Math.max(0, totalOrdered - totalReceived - totalRejected);

  let isOverdue = false;
  let overdueDays = 0;

  if (po.expectedDelivery && pendingQuantity > 0) {
    const deliveryDate = new Date(po.expectedDelivery).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    if (today > deliveryDate) {
      isOverdue = true;
      overdueDays = Math.ceil((today - deliveryDate) / (1000 * 60 * 60 * 24));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-0)] shadow-2xl text-xs text-[var(--color-ink-900)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[var(--color-border)] p-5 bg-[var(--color-surface-1)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                {po.poNumber}
              </span>
              <StatusBadge label={po.status} />

              {po.hasRejections || totalRejected > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-900/60">
                  ⚠️ {totalRejected} Units Rejected
                </span>
              ) : null}

              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-900/60">
                  🔴 {overdueDays} days overdue
                </span>
              )}

              {(po.isRescheduled || reschedules.length > 0) && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-900/60"
                  title={`Rescheduled ${reschedules.length || po.rescheduleCount || 1} time(s). Latest expected delivery: ${po.expectedDelivery}`}
                >
                  <Clock size={11} /> {(reschedules.length || po.rescheduleCount || 1) > 1 ? `Rescheduled (${reschedules.length || po.rescheduleCount}x)` : "Rescheduled"}
                </span>
              )}
            </div>

            <h2 className="text-base font-semibold text-[var(--color-ink-900)]">{po.supplier}</h2>
            {po.supplierAddress && (
              <p className="text-xs text-[var(--color-ink-500)] flex items-center gap-1">
                <MapPin size={11} className="text-blue-500 shrink-0" />
                <span>{po.supplierAddress}</span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-[var(--color-border)] px-5 bg-[var(--color-surface-0)] overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("items")}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "items"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]"
            }`}
          >
            <ClipboardList size={13} /> Line Items & Status
          </button>

          <button
            onClick={() => setActiveTab("receipts")}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "receipts"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]"
            }`}
          >
            <PackageCheck size={13} /> Goods Receipts ({receipts.length})
          </button>

          <button
            onClick={() => setActiveTab("delivery")}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "delivery"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]"
            }`}
          >
            <Truck size={13} /> Delivery History ({reschedules.length})
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "audit"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]"
            }`}
          >
            <ShieldCheck size={13} /> Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {/* TAB 1: ITEMS & STATUS */}
          {activeTab === "items" && (
            <div className="space-y-4">
              {/* Metadata Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5">
                  <span className="text-[var(--color-ink-500)] block text-[10px]">PO Date</span>
                  <span className="font-medium text-[var(--color-ink-900)]">{po.poDate}</span>
                </div>

                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-[var(--color-ink-500)] block text-[10px]">Expected Delivery</span>
                    <span className="font-mono font-bold text-[var(--color-ink-900)] block">{po.expectedDelivery}</span>
                    {(po.isRescheduled || reschedules.length > 0) && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded border border-amber-300 dark:border-amber-900/60 mt-0.5"
                        title={`Rescheduled ${reschedules.length || po.rescheduleCount || 1} time(s)`}
                      >
                        <Clock size={10} /> {(reschedules.length || po.rescheduleCount || 1) > 1 ? `Rescheduled (${reschedules.length || po.rescheduleCount}x)` : "Rescheduled"}
                      </span>
                    )}
                  </div>
                  {!["Received", "Closed", "Cancelled"].includes(po.status) && (
                    <button
                      onClick={() => onOpenReschedule(po)}
                      title="Reschedule expected delivery date"
                      className="text-blue-600 hover:text-blue-800 p-1 cursor-pointer"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                </div>

                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5">
                  <span className="text-[var(--color-ink-500)] block text-[10px]">Total Received</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalReceived} / {totalOrdered}</span>
                </div>

                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5">
                  <span className="text-[var(--color-ink-500)] block text-[10px]">Pending Quantity</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{pendingQuantity} Units</span>
                </div>
              </div>

              {/* Overdue Warning Alert */}
              {isOverdue && (
                <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 p-3 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                  <div>
                    <strong>Overdue Delivery Warning:</strong> Expected delivery date ({po.expectedDelivery}) has passed and {pendingQuantity} units are still pending.
                  </div>
                </div>
              )}

              {/* Notes */}
              {po.notes && (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5 text-xs text-[var(--color-ink-700)]">
                  <span className="font-semibold text-[var(--color-ink-900)] block mb-0.5">Order Notes:</span>
                  {po.notes}
                </div>
              )}

              {/* Line Items Table */}
              <div>
                <p className="text-xs font-semibold text-[var(--color-ink-700)] mb-2">
                  Order Line Items ({po.lines?.length || 0})
                </p>
                <div className="border border-[var(--color-border)] rounded-md overflow-hidden bg-[var(--color-surface-1)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-left text-[var(--color-ink-500)] font-semibold">
                        <th className="p-2.5">Part / Item</th>
                        <th className="p-2.5 text-center">Ordered</th>
                        <th className="p-2.5 text-center text-emerald-700 dark:text-emerald-400">Accepted</th>
                        <th className="p-2.5 text-center text-rose-700 dark:text-rose-400">Rejected</th>
                        <th className="p-2.5 text-center text-blue-600 dark:text-blue-400">Pending</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {po.lines?.map((line, i) => {
                        const ord = Number(line.quantity) || 0;
                        const rec = Number(line.receivedQuantity) || 0;
                        const rej = Number(line.rejectedQuantity) || 0;
                        const pend = Math.max(0, ord - rec - rej);

                        return (
                          <tr key={i} className="hover:bg-[var(--color-surface-0)] transition-colors">
                            <td className="p-2.5 font-medium text-[var(--color-ink-900)]">
                              <div>{line.part}</div>
                              {line.category && (
                                <span className="text-[10px] text-[var(--color-ink-500)]">{line.category}</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-mono font-medium">{ord}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{rec}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400">{rej}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{pend}</td>
                            <td className="p-2.5 text-right font-mono">₹{line.unitPrice.toLocaleString("en-IN")}</td>
                            <td className="p-2.5 text-right font-mono font-semibold">₹{line.totalCost.toLocaleString("en-IN")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Order Value */}
              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs">
                <span className="font-semibold text-[var(--color-ink-600)]">Total Order Value</span>
                <span className="tabular text-sm font-bold text-blue-600 dark:text-blue-400">
                  ₹{po.total.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: GOODS RECEIPTS */}
          {activeTab === "receipts" && (
            <div className="space-y-3">
              {receipts.length > 0 ? (
                receipts.map((gr, idx) => (
                  <div key={gr.id || idx} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between border-b border-[var(--color-border)] pb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60">
                          {gr.receiptNumber}
                        </span>
                        <span className="text-[11px] text-[var(--color-ink-500)] font-mono">{gr.receiptDate}</span>
                      </div>
                      <span className="text-[11px] text-[var(--color-ink-600)]">
                        Received By: <strong>{gr.receivedBy}</strong>
                      </span>
                    </div>

                    {/* Receipt Items breakdown */}
                    <div className="space-y-1.5 pt-1">
                      {gr.items.map((it, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs border-b border-[var(--color-border)] last:border-0 pb-1.5 last:pb-0">
                          <div>
                            <span className="font-medium text-[var(--color-ink-900)]">{it.part}</span>
                            {it.rejectionReason && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400">
                                <strong>Rejection Reason:</strong> {it.rejectionReason === "Other" ? it.customRejectionReason : it.rejectionReason}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Accepted: +{it.acceptedQuantity}</span>
                            {it.rejectedQuantity > 0 && (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold">Rejected: {it.rejectedQuantity}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {gr.remarks && (
                      <p className="text-[11px] text-[var(--color-ink-500)] italic pt-1 border-t border-[var(--color-border)]">
                        Remarks: {gr.remarks}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[var(--color-ink-400)]">
                  <PackageCheck size={32} className="mx-auto opacity-40 mb-2" />
                  <p className="font-medium">No Goods Receipts Recorded Yet</p>
                  <p className="text-[11px] mt-1">Click "Receive Goods" to create a new receipt for this order.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DELIVERY HISTORY */}
          {activeTab === "delivery" && (
            <div className="space-y-3">
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[var(--color-ink-500)] block text-[10px]">Original Expected Delivery</span>
                  <span className="font-mono font-semibold text-[var(--color-ink-900)]">{po.expectedDelivery}</span>
                </div>
                {!["Received", "Closed", "Cancelled"].includes(po.status) && (
                  <button
                    onClick={() => onOpenReschedule(po)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    <Clock size={12} /> Reschedule Date
                  </button>
                )}
              </div>

              {reschedules.length > 0 ? (
                <div className="space-y-2">
                  {reschedules.map((r, i) => (
                    <div key={r.id || i} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono font-medium text-[var(--color-ink-900)]">
                        <div>
                          <span className="line-through text-[var(--color-ink-400)]">{r.previousDate}</span>
                          <span className="mx-1.5 text-blue-500 font-bold">→</span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold">{r.newDate}</span>
                        </div>
                        <span className="text-[10px] text-[var(--color-ink-400)]">{r.changedAt.slice(0, 16)}</span>
                      </div>
                      <p className="text-[var(--color-ink-700)]">
                        <strong>Reason:</strong> {r.reason}
                      </p>
                      {r.remarks && <p className="text-[var(--color-ink-500)] italic text-[11px]">Remarks: {r.remarks}</p>}
                      <p className="text-[10px] text-[var(--color-ink-400)] text-right">Changed By: {r.changedBy}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--color-ink-400)]">
                  <History size={32} className="mx-auto opacity-40 mb-2" />
                  <p className="font-medium">No Rescheduling History</p>
                  <p className="text-[11px] mt-1">This order is on its original delivery schedule.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUTOMATIC AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className="space-y-3">
              {auditLogs.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--color-border)]">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative text-xs space-y-1 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-lg p-3">
                      <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-blue-500 border-2 border-[var(--color-surface-0)]" />
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                          {log.action}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--color-ink-400)]">{log.timestamp}</span>
                      </div>

                      {log.newValue && (
                        <div className="text-[var(--color-ink-900)] font-medium pt-0.5">
                          {log.newValue}
                        </div>
                      )}

                      {log.previousValue && (
                        <div className="text-[11px] text-[var(--color-ink-500)]">
                          Previous: {log.previousValue}
                        </div>
                      )}

                      {log.reason && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-400">
                          <strong>Reason:</strong> {log.reason}
                        </div>
                      )}

                      {log.remarks && (
                        <div className="text-[11px] text-[var(--color-ink-600)] italic">
                          {log.remarks}
                        </div>
                      )}

                      <div className="text-[10px] text-[var(--color-ink-400)] text-right pt-1 border-t border-[var(--color-border)]/60">
                        Performed By: {log.performedBy}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--color-ink-400)]">
                  <ShieldCheck size={32} className="mx-auto opacity-40 mb-2" />
                  <p className="font-medium">No Audit Logs Recorded</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-1)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintPdf(po)}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
            >
              <FileText size={13} className="text-blue-600 dark:text-blue-400" />
              <span>Print PDF</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onEditOrder(po);
              }}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
            >
              <Pencil size={13} />
              <span>Edit PO</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Draft actions */}
            {po.status === "Draft" && (
              <>
                {onSubmitPo && (
                  <button
                    onClick={() => {
                      onClose();
                      onSubmitPo(po);
                    }}
                    className="inline-flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Submit PO</span>
                  </button>
                )}
                {onCancelPo && (
                  <button
                    onClick={() => {
                      onClose();
                      onCancelPo(po);
                    }}
                    className="inline-flex items-center gap-1.5 rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <span>Cancel PO</span>
                  </button>
                )}
              </>
            )}

            {/* Submitted actions */}
            {po.status === "Submitted" && (
              <>
                {onApprovePo && (
                  <button
                    onClick={() => {
                      onClose();
                      onApprovePo(po);
                    }}
                    className="inline-flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Approve PO</span>
                  </button>
                )}
                {onCancelPo && (
                  <button
                    onClick={() => {
                      onClose();
                      onCancelPo(po);
                    }}
                    className="inline-flex items-center gap-1.5 rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <span>Cancel PO</span>
                  </button>
                )}
              </>
            )}

            {/* Approved actions */}
            {po.status === "Approved" && (
              <>
                {onOrderPo && (
                  <button
                    onClick={() => {
                      onClose();
                      onOrderPo(po);
                    }}
                    className="inline-flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Place / Confirm Order</span>
                  </button>
                )}
                {onCancelPo && (
                  <button
                    onClick={() => {
                      onClose();
                      onCancelPo(po);
                    }}
                    className="inline-flex items-center gap-1.5 rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <span>Cancel PO</span>
                  </button>
                )}
              </>
            )}

            {/* Ordered & Partially Received actions */}
            {["Ordered", "Partially Received"].includes(po.status) && (
              <>
                {!["Received", "Closed", "Cancelled"].includes(po.status) && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenReschedule(po);
                    }}
                    className="inline-flex items-center gap-1.5 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <Clock size={13} />
                    <span>Reschedule</span>
                  </button>
                )}

                {pendingQuantity > 0 && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenReceive(po);
                    }}
                    className="inline-flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
                  >
                    <PackageCheck size={14} />
                    <span>Receive Goods</span>
                  </button>
                )}

                {po.status === "Ordered" && onCancelPo && (
                  <button
                    onClick={() => {
                      onClose();
                      onCancelPo(po);
                    }}
                    className="inline-flex items-center gap-1.5 rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <span>Cancel PO</span>
                  </button>
                )}
              </>
            )}

            {/* Received actions */}
            {po.status === "Received" && onClosePo && (
              <button
                onClick={() => {
                  onClose();
                  onClosePo(po);
                }}
                className="inline-flex items-center gap-1.5 rounded bg-slate-700 hover:bg-slate-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
              >
                <span>Close PO</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-surface-1)] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
