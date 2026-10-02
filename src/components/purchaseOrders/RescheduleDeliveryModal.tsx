import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, AlertTriangle, History } from "lucide-react";
import { reschedulePoDelivery, getDeliveryReschedules } from "../../services/purchaseOrderApi";
import type { PurchaseOrder, PoDeliveryReschedule } from "../../types";

interface RescheduleDeliveryModalProps {
  po: PurchaseOrder;
  onClose: () => void;
  onSuccess: (updatedPo: PurchaseOrder, toastMsg: string) => void;
}

const RESCHEDULE_REASONS = [
  "Supplier requested extension",
  "Logistics & transportation delay",
  "Customs & transit clearance delay",
  "Quality re-inspection requested",
  "Depot storage constraint",
  "Other",
];

export const RescheduleDeliveryModal: React.FC<RescheduleDeliveryModalProps> = ({ po, onClose, onSuccess }) => {
  const isBlocked = ["Received", "Closed", "Cancelled"].includes(po.status);

  const [newDate, setNewDate] = useState(po.expectedDelivery || new Date().toISOString().slice(0, 10));
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [history, setHistory] = useState<PoDeliveryReschedule[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHistory(getDeliveryReschedules(po.poNumber));
  }, [po.poNumber]);

  const effectiveReason = selectedReason === "Other" ? customReason : selectedReason;
  const isValid = !isBlocked && Boolean(newDate) && Boolean(effectiveReason.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await reschedulePoDelivery({
        poNumber: po.poNumber,
        newDate,
        reason: effectiveReason.trim(),
        remarks: remarks.trim(),
        changedBy: "KSRTC Procurement Officer",
      });

      const toastMsg = `[Delivery Rescheduled] PO #${po.poNumber} delivery date updated from ${po.expectedDelivery} to ${newDate}!`;
      onSuccess(res.updatedPo, toastMsg);
      onClose();
    } catch (err: any) {
      console.error("Failed to reschedule delivery:", err);
      setError(err?.message || "Failed to update expected delivery date.");
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
        className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-0)] shadow-2xl text-xs text-[var(--color-ink-900)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 bg-[var(--color-surface-1)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                {po.poNumber}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 flex items-center gap-1">
                <Calendar size={12} /> Delivery & Rescheduling
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {isBlocked ? (
            <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>
                Delivery rescheduling is disabled because this PO has already been <strong>{po.status}</strong>.
              </span>
            </div>
          ) : null}

          {error && (
            <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dates Overview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
              <span className="text-[var(--color-ink-500)] block text-[10px] mb-0.5">Current Expected Delivery</span>
              <span className="font-mono font-bold text-sm text-[var(--color-ink-900)]">
                {po.expectedDelivery || "Not Set"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-ink-700)] mb-1">
                New Expected Delivery Date *
              </label>
              <input
                type="date"
                disabled={isBlocked}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded border border-blue-500 bg-[var(--color-surface-0)] px-3 py-2 text-xs font-mono text-[var(--color-ink-900)] focus:outline-none"
              />
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-700)] mb-1">
              Rescheduling Reason *
            </label>
            <select
              disabled={isBlocked}
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-xs font-medium text-[var(--color-ink-900)] focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="">Select Reason for Rescheduling…</option>
              {RESCHEDULE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {!selectedReason && !isBlocked && (
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block mt-0.5">
                * Reason is mandatory when changing delivery date
              </span>
            )}
          </div>

          {/* Custom Reason if Other */}
          {selectedReason === "Other" && (
            <div>
              <label className="block text-xs font-semibold text-[var(--color-ink-700)] mb-1">
                Specify Reason Details *
              </label>
              <input
                type="text"
                disabled={isBlocked}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="e.g. Weather disruption in port logistics"
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-xs text-[var(--color-ink-900)] focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-700)] mb-1">
              Remarks / Officer Notes (Optional)
            </label>
            <textarea
              rows={2}
              disabled={isBlocked}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add additional remarks or supplier communication notes…"
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-xs text-[var(--color-ink-900)] focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Delivery Rescheduling History */}
          <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-[var(--color-ink-700)] flex items-center gap-1.5">
                <History size={13} className="text-blue-500" />
                <span>Delivery Rescheduling History ({history.length})</span>
              </span>
            </div>

            {history.length > 0 ? (
              <div className="space-y-2 border border-[var(--color-border)] rounded-md p-3 bg-[var(--color-surface-1)] max-h-40 overflow-y-auto custom-scrollbar">
                {history.map((h, i) => (
                  <div key={h.id || i} className="flex items-start justify-between border-b border-[var(--color-border)] last:border-0 pb-2 last:pb-0 text-[11px]">
                    <div>
                      <div className="font-medium text-[var(--color-ink-900)] flex items-center gap-1.5">
                        <span className="line-through text-[var(--color-ink-400)]">{h.previousDate}</span>
                        <span>→</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{h.newDate}</span>
                      </div>
                      <p className="text-[var(--color-ink-600)] mt-0.5">
                        <strong>Reason:</strong> {h.reason}
                      </p>
                      {h.remarks && <p className="text-[var(--color-ink-500)] text-[10px] italic">{h.remarks}</p>}
                    </div>
                    <div className="text-right text-[10px] text-[var(--color-ink-400)] shrink-0 pl-2">
                      <div>{h.changedBy}</div>
                      <div>{h.changedAt.slice(0, 10)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[var(--color-ink-400)] italic">
                No previous reschedules recorded for this order (original date: {po.expectedDelivery}).
              </p>
            )}
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
              className="inline-flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Clock size={14} />
              <span>{submitting ? "Updating…" : "Confirm Reschedule"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
