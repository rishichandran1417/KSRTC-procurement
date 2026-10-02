import React, { useState } from "react";
import { X, AlertTriangle, Ban } from "lucide-react";
import type { PurchaseOrder } from "../../types";

interface CancelPoModalProps {
  po: PurchaseOrder;
  onClose: () => void;
  onConfirmCancel: (poNumber: string, reason: string) => Promise<void> | void;
}

export const CancelPoModal: React.FC<CancelPoModalProps> = ({
  po,
  onClose,
  onConfirmCancel,
}) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("A cancellation reason is required to cancel a purchase order.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onConfirmCancel(po.poNumber, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to cancel purchase order.");
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
        className="w-full max-w-md flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-0)] shadow-2xl text-xs text-[var(--color-ink-900)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[var(--color-border)] p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <Ban size={18} className="text-rose-600 dark:text-rose-400" />
            <h3 className="font-semibold text-sm">Cancel Purchase Order</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-rose-700 hover:text-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="rounded-md bg-rose-50 dark:bg-rose-950/30 p-3 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle size={14} className="shrink-0 text-rose-600" />
              <span>Confirm Order Cancellation</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              You are about to cancel purchase order <strong className="font-mono">{po.poNumber}</strong> ({po.supplier}).
              Once cancelled, no goods can be received and the order will become permanently read-only for audit history.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink-800)] mb-1">
              Cancellation Reason *
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter specific reason for cancelling (e.g., Supplier stock shortage, duplicate order, budget reallocation)..."
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5 text-xs text-[var(--color-ink-900)] focus:border-rose-500 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-300">
              ⚠️ {error}
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-surface-1)] transition-colors cursor-pointer"
            >
              Keep Order Active
            </button>

            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="inline-flex items-center gap-1.5 rounded bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
            >
              <Ban size={13} />
              <span>{submitting ? "Cancelling..." : "Confirm Cancellation"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
