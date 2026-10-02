import React, { useState } from "react";
import { X, PackageCheck, AlertTriangle, CheckCircle2, ShieldAlert, Split, Calendar } from "lucide-react";
import { processGoodsReceipt } from "../../services/purchaseOrderApi";
import type { PurchaseOrder, GoodsReceiptItem, RejectionReason } from "../../types";

interface ReceiveGoodsModalProps {
  po: PurchaseOrder;
  onClose: () => void;
  onSuccess: (updatedPo: PurchaseOrder, toastMsg: string) => void;
}

const REJECTION_REASONS: RejectionReason[] = [
  "Damaged",
  "Wrong Specification",
  "Wrong Item",
  "Quantity Discrepancy",
  "Quality Failure",
  "Other",
];

export const ReceiveGoodsModal: React.FC<ReceiveGoodsModalProps> = ({ po, onClose, onSuccess }) => {
  const [items, setItems] = useState<
    {
      part: string;
      category?: string;
      orderedQuantity: number;
      previouslyReceived: number;
      previouslyRejected: number;
      pendingQuantity: number;
      acceptedQuantity: number | "";
      rejectedQuantity: number | "";
      rejectionReason: RejectionReason | "";
      customRejectionReason: string;
      remarks: string;
    }[]
  >(() => {
    return (po.lines || []).map((line) => {
      const ordered = Number(line.quantity) || 0;
      const prevRec = Number(line.receivedQuantity) || 0;
      const prevRej = Number(line.rejectedQuantity) || 0;
      const pending = Math.max(0, ordered - prevRec - prevRej);
      return {
        part: line.part,
        category: line.category,
        orderedQuantity: ordered,
        previouslyReceived: prevRec,
        previouslyRejected: prevRej,
        pendingQuantity: pending,
        acceptedQuantity: pending, // default to receive full pending
        rejectedQuantity: 0,
        rejectionReason: "",
        customRejectionReason: "",
        remarks: "",
      };
    });
  });

  const [globalRemarks, setGlobalRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleItemChange = (
    index: number,
    field: "acceptedQuantity" | "rejectedQuantity" | "rejectionReason" | "customRejectionReason" | "remarks",
    rawVal: any
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };

      if (field === "rejectedQuantity") {
        const parsedVal = rawVal === "" ? "" : Math.max(0, parseInt(String(rawVal), 10) || 0);
        const rejNum = parsedVal === "" ? 0 : parsedVal;
        const boundedRej = Math.min(rejNum, item.pendingQuantity);

        item.rejectedQuantity = parsedVal === "" ? "" : boundedRej;
        // Auto-adjust accepted quantity so Accepted + Rejected = Pending Quantity
        item.acceptedQuantity = Math.max(0, item.pendingQuantity - boundedRej);
      } else if (field === "acceptedQuantity") {
        const parsedVal = rawVal === "" ? "" : Math.max(0, parseInt(String(rawVal), 10) || 0);
        const accNum = parsedVal === "" ? 0 : parsedVal;
        const boundedAcc = Math.min(accNum, item.pendingQuantity);

        item.acceptedQuantity = parsedVal === "" ? "" : boundedAcc;
        const currentRej = Number(item.rejectedQuantity) || 0;
        if (boundedAcc + currentRej > item.pendingQuantity) {
          item.rejectedQuantity = Math.max(0, item.pendingQuantity - boundedAcc);
        }
      } else if (field === "rejectionReason") {
        item.rejectionReason = rawVal;
        if (rawVal !== "Other") item.customRejectionReason = "";
      } else if (field === "customRejectionReason") {
        item.customRejectionReason = rawVal;
      } else if (field === "remarks") {
        item.remarks = rawVal;
      }

      copy[index] = item;
      return copy;
    });
  };

  // Perform validation checks
  const getValidationErrors = (): string[] => {
    const errs: string[] = [];
    let totalProcessed = 0;

    items.forEach((item, idx) => {
      const accepted = Number(item.acceptedQuantity) || 0;
      const rejected = Number(item.rejectedQuantity) || 0;
      const sum = accepted + rejected;
      totalProcessed += sum;

      if (accepted < 0 || rejected < 0) {
        errs.push(`Line ${idx + 1} (${item.part}): Quantities cannot be negative.`);
      }

      if (sum > item.pendingQuantity) {
        errs.push(
          `Line ${idx + 1} (${item.part}): Receive Now (${accepted}) + Rejected (${rejected}) = ${sum}, which exceeds Pending Quantity (${item.pendingQuantity}).`
        );
      }

      if (rejected > 0 && item.rejectionReason === "Other" && !item.customRejectionReason.trim()) {
        errs.push(`Line ${idx + 1} (${item.part}): Please provide a custom rejection reason for 'Other'.`);
      }
    });

    if (totalProcessed === 0) {
      errs.push("You must enter at least 1 unit to receive or reject.");
    }

    return errs;
  };

  const validationErrors = getValidationErrors();
  const isValid = validationErrors.length === 0;

  // Live total metrics
  const totalAcceptedNow = items.reduce((sum, i) => sum + (Number(i.acceptedQuantity) || 0), 0);
  const totalRejectedNow = items.reduce((sum, i) => sum + (Number(i.rejectedQuantity) || 0), 0);
  const totalRemainingPending = items.reduce(
    (sum, i) =>
      sum + Math.max(0, i.pendingQuantity - ((Number(i.acceptedQuantity) || 0) + (Number(i.rejectedQuantity) || 0))),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const goodsReceiptItems: GoodsReceiptItem[] = items.map((it) => ({
        part: it.part,
        category: it.category,
        orderedQuantity: it.orderedQuantity,
        previouslyReceived: it.previouslyReceived,
        pendingQuantity: it.pendingQuantity,
        acceptedQuantity: Number(it.acceptedQuantity) || 0,
        rejectedQuantity: Number(it.rejectedQuantity) || 0,
        rejectionReason: it.rejectionReason || (Number(it.rejectedQuantity) > 0 ? "Damaged" : undefined),
        customRejectionReason: it.customRejectionReason || undefined,
        remarks: it.remarks || undefined,
      }));

      const res = await processGoodsReceipt({
        poNumber: po.poNumber,
        items: goodsReceiptItems,
        globalRemarks,
        receivedBy: "KSRTC Procurement Officer",
      });

      let toastMsg = `[Goods Receipt Created] PO #${po.poNumber}: ${totalAcceptedNow} units accepted into central inventory stock.`;
      if (totalRejectedNow > 0) {
        toastMsg += ` (${totalRejectedNow} units rejected for inspection/damage).`;
      }

      onSuccess(res.updatedPo, toastMsg);
      onClose();
    } catch (err: any) {
      console.error("Failed to process goods receipt:", err);
      setError(err?.message || "Failed to create goods receipt record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-0)] shadow-2xl text-xs text-[var(--color-ink-900)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 bg-[var(--color-surface-1)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                {po.poNumber}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1">
                <PackageCheck size={12} /> Goods Receipt Entry
              </span>
            </div>
            <h2 className="text-base font-semibold text-[var(--color-ink-900)] mt-1">{po.supplier}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {error && (
            <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SPLIT DELIVERY SCHEDULE BANNER */}
          {po.deliverySchedule && po.deliverySchedule.length > 0 && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <Split size={14} className="text-blue-600 dark:text-blue-400" />
                  Split Delivery Schedule ({po.deliverySchedule.length} Installments)
                </span>
                <span className="text-[10px] text-blue-700 dark:text-blue-400 font-mono">
                  Staggered Delivery Commitments
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {po.deliverySchedule.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="rounded border border-blue-200 dark:border-blue-800 bg-[var(--color-surface-0)] p-2 text-[11px] space-y-0.5"
                  >
                    <div className="flex items-center justify-between font-semibold text-[var(--color-ink-900)]">
                      <span className="text-blue-600 dark:text-blue-400 font-mono">Installment #{t.installmentNumber}</span>
                      <span className="font-bold">{t.quantity} units</span>
                    </div>
                    <div className="text-[10px] text-[var(--color-ink-500)] flex items-center gap-1">
                      <Calendar size={10} className="text-blue-500" />
                      <span>Due: {t.expectedDate}</span>
                    </div>
                    {t.notes && <div className="text-[10px] text-[var(--color-ink-600)] italic truncate">{t.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Line Items Receiving Table */}
          <div className="space-y-4">
            {items.map((item, idx) => {
              const accepted = Number(item.acceptedQuantity) || 0;
              const rejected = Number(item.rejectedQuantity) || 0;
              const isOverLimit = accepted + rejected > item.pendingQuantity;

              return (
                <div
                  key={idx}
                  className={`rounded-lg border p-4 space-y-3 transition-colors ${
                    isOverLimit
                      ? "border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20"
                      : "border-[var(--color-border)] bg-[var(--color-surface-1)]"
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--color-ink-900)]">{item.part}</span>
                        {item.category && (
                          <span className="rounded bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-600)] border border-[var(--color-border)]">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock Metrics summary badges */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="px-2 py-1 rounded bg-[var(--color-surface-0)] border border-[var(--color-border)] text-[var(--color-ink-600)]">
                        Ordered: <strong>{item.orderedQuantity}</strong>
                      </span>
                      <span className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        Prev Received: <strong>{item.previouslyReceived}</strong>
                      </span>
                      {item.previouslyRejected > 0 && (
                        <span className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300">
                          Prev Rejected: <strong>{item.previouslyRejected}</strong>
                        </span>
                      )}
                      <span className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                        Pending: <strong>{item.pendingQuantity}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Quantity Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    {/* Receive Now (Accepted) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                        Receive Now (Accepted) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.pendingQuantity}
                        value={item.acceptedQuantity}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleItemChange(idx, "acceptedQuantity", e.target.value)}
                        className="w-full rounded border border-emerald-400 dark:border-emerald-700 bg-[var(--color-surface-0)] px-3 py-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-[10px] text-[var(--color-ink-400)] block mt-0.5">
                        Adds directly to inventory stock
                      </span>
                    </div>

                    {/* Rejected Quantity */}
                    <div>
                      <label className="block text-[11px] font-semibold text-rose-700 dark:text-rose-400 mb-1">
                        Rejected Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.pendingQuantity}
                        value={item.rejectedQuantity}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleItemChange(idx, "rejectedQuantity", e.target.value)}
                        className="w-full rounded border border-rose-300 dark:border-rose-700 bg-[var(--color-surface-0)] px-3 py-1.5 text-xs font-bold text-rose-900 dark:text-rose-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                      <span className="text-[10px] text-[var(--color-ink-400)] block mt-0.5">
                        Stored for traceability (NOT added to stock)
                      </span>
                    </div>

                    {/* Rejection Reason Dropdown (if rejected > 0) */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-[var(--color-ink-700)] mb-1">
                        Rejection Reason {Number(item.rejectedQuantity) > 0 ? "*" : "(Optional)"}
                      </label>
                      <select
                        disabled={Number(item.rejectedQuantity) <= 0}
                        value={item.rejectionReason}
                        onChange={(e) => handleItemChange(idx, "rejectionReason", e.target.value as RejectionReason)}
                        className={`w-full rounded border px-3 py-1.5 text-xs focus:outline-none cursor-pointer ${
                          Number(item.rejectedQuantity) > 0 && !item.rejectionReason
                            ? "border-rose-500 bg-rose-50/50 text-rose-900"
                            : "border-[var(--color-border)] bg-[var(--color-surface-0)] text-[var(--color-ink-900)]"
                        }`}
                      >
                        <option value="">Select Rejection Reason…</option>
                        {REJECTION_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {Number(item.rejectedQuantity) > 0 && !item.rejectionReason && (
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold block mt-0.5">
                          ⚠️ Reason required for rejected items
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Custom Rejection Reason if 'Other' selected */}
                  {Number(item.rejectedQuantity) > 0 && item.rejectionReason === "Other" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                        Specify Custom Rejection Reason *
                      </label>
                      <input
                        type="text"
                        value={item.customRejectionReason}
                        onChange={(e) => handleItemChange(idx, "customRejectionReason", e.target.value)}
                        placeholder="e.g. Surface cracks detected during receiving inspection"
                        className="w-full rounded border border-amber-400 bg-[var(--color-surface-0)] px-3 py-1.5 text-xs text-[var(--color-ink-900)] focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Line Item Remarks */}
                  <div>
                    <input
                      type="text"
                      value={item.remarks}
                      onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                      placeholder="Line item receiving remarks / serial numbers (optional)…"
                      className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-1.5 text-xs text-[var(--color-ink-800)] focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Global Receipt Remarks */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-700)] mb-1">
              Overall Goods Receipt Remarks
            </label>
            <textarea
              rows={2}
              value={globalRemarks}
              onChange={(e) => setGlobalRemarks(e.target.value)}
              placeholder="e.g. Received via Kerala Road Transport Cargo Fleet #KL-15-A-4022. Lorry receipt #8921."
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-xs text-[var(--color-ink-900)] focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Realtime Validation Warning Box */}
          {validationErrors.length > 0 && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 p-3 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <ShieldAlert size={14} /> Validation Warnings:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Live Summary Preview */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-[var(--color-ink-500)] block text-[10px]">Accepting into Stock:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  +{totalAcceptedNow} Units
                </span>
              </div>
              <div>
                <span className="text-[var(--color-ink-500)] block text-[10px]">Recording Rejections:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                  {totalRejectedNow} Units
                </span>
              </div>
              <div>
                <span className="text-[var(--color-ink-500)] block text-[10px]">Remaining Pending:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {totalRemainingPending} Units
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[var(--color-ink-500)] block text-[10px]">Resulting PO Status:</span>
              <span className="font-semibold text-blue-700 dark:text-blue-300">
                {totalRemainingPending > 0 || totalRejectedNow > 0 || po.hasRejections
                  ? "Partially Received"
                  : "Received (Fulfilled)"}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-2 text-xs font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={14} />
              <span>{submitting ? "Processing Receipt…" : "Submit Goods Receipt"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
