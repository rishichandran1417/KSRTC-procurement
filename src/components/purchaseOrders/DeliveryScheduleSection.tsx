import React from "react";
import { Plus, Trash2, Calendar, Split, CheckCircle2, AlertCircle } from "lucide-react";
import type { DeliveryInstallment } from "../../types";

interface DeliveryScheduleSectionProps {
  totalOrderedQuantity: number;
  baseExpectedDelivery: string;
  installments: DeliveryInstallment[];
  onChange: (updated: DeliveryInstallment[]) => void;
  readOnly?: boolean;
}

export const DeliveryScheduleSection: React.FC<DeliveryScheduleSectionProps> = ({
  totalOrderedQuantity,
  baseExpectedDelivery,
  installments,
  onChange,
  readOnly = false,
}) => {
  const currentTotal = installments.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const isExactMatch = totalOrderedQuantity > 0 && currentTotal === totalOrderedQuantity;
  const isMismatch = totalOrderedQuantity > 0 && installments.length > 0 && currentTotal !== totalOrderedQuantity;

  // Helper to add days to ISO date string
  const addDays = (baseDateStr: string, daysToAdd: number): string => {
    const base = baseDateStr ? new Date(baseDateStr) : new Date();
    if (isNaN(base.getTime())) return new Date().toISOString().slice(0, 10);
    const res = new Date(base.getTime() + daysToAdd * 86400000);
    return res.toISOString().slice(0, 10);
  };

  const handleAddInstallment = () => {
    const nextNum = installments.length + 1;
    const remainingQty = Math.max(0, totalOrderedQuantity - currentTotal);
    const prevDate = installments[installments.length - 1]?.expectedDate || baseExpectedDelivery || new Date().toISOString().slice(0, 10);
    const nextDate = addDays(prevDate, 7);

    const newItem: DeliveryInstallment = {
      id: `tranche-custom-${Date.now()}-${nextNum}`,
      installmentNumber: nextNum,
      expectedDate: nextDate,
      quantity: remainingQty > 0 ? remainingQty : 1,
      receivedQuantity: 0,
      status: "Scheduled",
      notes: `Installment ${nextNum} delivery`,
    };

    onChange([...installments, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof DeliveryInstallment, value: any) => {
    const copy = [...installments];
    const updatedItem = { ...copy[index], [field]: value };
    copy[index] = updatedItem;
    // Re-index installment numbers
    const reindexed = copy.map((item, idx) => ({ ...item, installmentNumber: idx + 1 }));
    onChange(reindexed);
  };

  const handleRemoveItem = (index: number) => {
    const copy = installments.filter((_, idx) => idx !== index);
    const reindexed = copy.map((item, idx) => ({ ...item, installmentNumber: idx + 1 }));
    onChange(reindexed);
  };

  const handleClearSchedule = () => {
    onChange([]);
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-0)] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
        <div className="flex items-center gap-2">
          <Split size={15} className="text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-semibold text-[var(--color-ink-900)] uppercase tracking-wider">
            Split Delivery Schedule / Staggered Installments
          </h4>
          {installments.length > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
              {installments.length} Installments
            </span>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            {installments.length > 0 && (
              <button
                type="button"
                onClick={handleClearSchedule}
                className="text-[11px] font-medium text-[var(--color-ink-500)] hover:text-rose-600 dark:hover:text-rose-400 px-2 py-1 transition-colors cursor-pointer"
                title="Clear split schedule"
              >
                Clear Schedule
              </button>
            )}
            <button
              type="button"
              onClick={handleAddInstallment}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] text-[var(--color-ink-800)] transition-colors cursor-pointer shadow-2xs"
            >
              <Plus size={13} /> Add Custom Installment
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[var(--color-ink-500)] leading-relaxed">
        Define custom delivery dates and tranche quantities when a supplier delivers order items in separate partial shipments.
      </p>

      {/* Installments Table */}
      {installments.length > 0 ? (
        <div className="space-y-2">
          <div className="overflow-x-auto rounded border border-[var(--color-border)]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[var(--color-surface-1)] text-[var(--color-ink-600)] border-b border-[var(--color-border)] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="px-3 py-2 w-20 text-center">Installment #</th>
                  <th className="px-3 py-2 min-w-[140px]">Delivery Date</th>
                  <th className="px-3 py-2 w-32 text-center">Qty (Units)</th>
                  <th className="px-3 py-2">Installment Notes / Delivery Commitment</th>
                  {!readOnly && <th className="px-2 py-2 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface-0)]">
                {installments.map((item, idx) => {
                  const recQty = item.receivedQuantity || 0;
                  const isDone = recQty >= item.quantity && item.quantity > 0;
                  return (
                    <tr key={item.id || idx} className="hover:bg-[var(--color-surface-1)]/50 transition-colors">
                      <td className="px-3 py-2 text-center font-mono font-bold text-[11px] text-blue-600 dark:text-blue-400">
                        #{item.installmentNumber} {isDone && "✓"}
                      </td>
                      <td className="px-3 py-2">
                        {readOnly ? (
                          <span className="font-mono text-xs text-[var(--color-ink-900)] flex items-center gap-1">
                            <Calendar size={12} className="text-blue-500" />
                            {item.expectedDate}
                          </span>
                        ) : (
                          <input
                            type="date"
                            value={item.expectedDate}
                            onChange={(e) => handleUpdateItem(idx, "expectedDate", e.target.value)}
                            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 py-1.5 text-xs font-mono text-[var(--color-ink-900)] focus:border-blue-500 focus:outline-none"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {readOnly ? (
                          <span className="font-bold text-xs tabular text-[var(--color-ink-900)]">
                            {item.quantity} units {recQty > 0 ? `(${recQty} rec)` : ""}
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateItem(idx, "quantity", val === "" ? "" : Math.max(1, Number(val)));
                              }}
                              className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 py-1.5 text-xs font-bold text-center tabular text-[var(--color-ink-900)] focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {readOnly ? (
                          <span className="text-xs text-[var(--color-ink-700)]">{item.notes || "—"}</span>
                        ) : (
                          <input
                            type="text"
                            value={item.notes || ""}
                            onChange={(e) => handleUpdateItem(idx, "notes", e.target.value)}
                            placeholder="e.g. 1st batch shipment"
                            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 py-1.5 text-xs text-[var(--color-ink-900)] focus:border-blue-500 focus:outline-none"
                          />
                        )}
                      </td>
                      {!readOnly && (
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-[var(--color-ink-400)] hover:text-rose-500 cursor-pointer transition-colors"
                            title="Remove installment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Validation Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <div className="flex items-center gap-1.5">
              {isExactMatch ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60 text-[11px]">
                  <CheckCircle2 size={13} /> Total Scheduled: {currentTotal} / {totalOrderedQuantity} units (Exact Match ✓)
                </span>
              ) : isMismatch ? (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/60 text-[11px]">
                  <AlertCircle size={13} /> Scheduled Total ({currentTotal}) does not match Ordered Total ({totalOrderedQuantity} units)
                </span>
              ) : (
                <span className="text-[var(--color-ink-500)] text-[11px]">
                  Scheduled total: {currentTotal} units
                </span>
              )}
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={handleAddInstallment}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <Plus size={13} /> Add Installment
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded border border-dashed border-[var(--color-border)] p-4 text-center bg-[var(--color-surface-1)]/50 space-y-2">
          <p className="text-xs text-[var(--color-ink-500)]">
            No split delivery schedule configured. Single shipment expected on <strong>{baseExpectedDelivery || "Expected Date"}</strong>.
          </p>
          {!readOnly && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleAddInstallment}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-0)] hover:bg-[var(--color-surface-2)] text-[var(--color-ink-900)] cursor-pointer transition-all shadow-2xs"
              >
                <Plus size={13} /> Add Custom Split
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
