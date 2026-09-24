import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Trash2, CheckCircle2, AlertTriangle, Send, ArrowLeft } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { SINGLE_DEPOT_NAME } from "../state/FiltersContext";
import { createPurchaseOrder } from "../services/purchaseOrderApi";
import type { ProcurementItem, PurchaseOrder, PurchaseOrderLine } from "../types";

interface NavState {
  items?: ProcurementItem[];
  source?: "critical" | "pulp" | "low_stock" | "manual";
  isCritical?: boolean;
  notes?: string;
}

export default function NewPurchaseOrder() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as NavState | null) ?? {};
  const prefilledItems = state.items || [];
  const isCriticalBuy = Boolean(state.isCritical || state.source === "critical");

  const [lines, setLines] = useState<PurchaseOrderLine[]>(
    prefilledItems.length > 0
      ? prefilledItems.map((i) => ({
          part: i.part,
          quantity: i.quantity,
          unitPrice: i.unit_price || 0,
          totalCost: (i.quantity || 1) * (i.unit_price || 0),
        }))
      : [{ part: "", quantity: 1, unitPrice: 0, totalCost: 0 }]
  );

  const [supplier, setSupplier] = useState(
    prefilledItems[0]?.supplier || (isCriticalBuy ? "KSRTC Central Stores / Urgent Vendor" : "")
  );
  const [expectedDelivery, setExpectedDelivery] = useState(
    new Date(Date.now() + (isCriticalBuy ? 3 : 7) * 86400000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(
    state.notes ||
      (isCriticalBuy
        ? "Emergency Critical Stockout Procurement (Critical Buy)"
        : prefilledItems.length > 0
        ? "Pre-populated from PuLP Optimization Model Recommendation"
        : "")
  );
  const [submitting, setSubmitting] = useState(false);

  const updateLineQty = (idx: number, qty: number) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, quantity: qty, totalCost: qty * l.unitPrice } : l))
    );
  };

  const updateLinePrice = (idx: number, price: number) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, unitPrice: price, totalCost: l.quantity * price } : l))
    );
  };

  const updateLinePart = (idx: number, partName: string) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, part: partName } : l))
    );
  };

  const addLine = () => {
    setLines((prev) => [...prev, { part: "", quantity: 1, unitPrice: 0, totalCost: 0 }]);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const total = lines.reduce((sum, l) => sum + l.totalCost, 0);

  const submit = () => {
    if (lines.length === 0) return;
    setSubmitting(true);
    const po: PurchaseOrder = {
      poNumber: `PO-2026-${Date.now().toString().slice(-4)}`,
      supplier: supplier.trim() || (isCriticalBuy ? "Emergency Procurement Vendor" : "KSRTC Depot Vendor"),
      depot: SINGLE_DEPOT_NAME,
      poDate: new Date().toISOString().slice(0, 10),
      expectedDelivery,
      total,
      status: "Submitted",
      lines: lines.filter((l) => l.part.trim().length > 0),
      notes,
    };
    createPurchaseOrder(po).then(() => {
      setSubmitting(false);
      navigate("/purchase-orders");
    });
  };

  return (
    <div>
      <TopBar
        title={isCriticalBuy ? "Create Critical Purchase Order" : "Create Purchase Order"}
        subtitle="Review, adjust pricing/quantities, and submit purchase order to database"
      />

      <div className="p-4 sm:p-6 max-w-4xl space-y-4">
        {/* TOP QUICK ACTION & BREADCRUMB */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[--color-surface-0] p-3 rounded-lg border border-[--color-border]">
          <button
            onClick={() => navigate("/purchase-orders")}
            className="flex items-center gap-1.5 text-xs font-medium text-[--color-ink-600] hover:text-[--color-ink-900] cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Purchase Orders
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[--color-ink-500]">
              Total: <strong className="text-sm font-bold text-blue-600 dark:text-blue-400">₹{total.toLocaleString("en-IN")}</strong>
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || lines.length === 0}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold text-white shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer ${
                isCriticalBuy ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <Send size={13} />
              <span>{submitting ? "Submitting…" : isCriticalBuy ? "Submit Critical PO" : "Submit PO"}</span>
            </button>
          </div>
        </div>

        {/* NOTIFICATION BANNERS */}
        {isCriticalBuy ? (
          <div className="flex items-center gap-3 rounded-lg border border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="flex-1">
              <p className="font-bold text-sm">Emergency Critical Buy Mode</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">
                Form populated with <strong>{prefilledItems.length} critical spare parts</strong> to prevent depot fleet grounding. Verify quantities and unit prices below and click <strong>Submit Critical PO</strong>.
              </p>
            </div>
          </div>
        ) : prefilledItems.length > 0 ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-3.5 text-xs text-blue-800 dark:text-blue-200">
            <CheckCircle2 size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />
            <span>
              Form populated with <strong>{prefilledItems.length} items</strong>. You can adjust quantities, unit prices, or add additional line items below.
            </span>
          </div>
        ) : null}

        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-2xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[--color-ink-500]">
                Supplier Name
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Enter supplier name"
                className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-0] px-3 py-2 text-sm font-medium text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[--color-ink-500]">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
                className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-0] px-3 py-2 text-sm text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[--color-ink-500]">
                Order Line Items ({lines.length})
              </label>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[--color-border]">
              <table className="w-full text-sm min-w-[550px]">
                <thead>
                  <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left text-xs uppercase tracking-wider text-[--color-ink-500]">
                    <th className="px-3.5 py-2.5">Part / Item</th>
                    <th className="px-3.5 py-2.5">Quantity</th>
                    <th className="px-3.5 py-2.5">Unit Price (₹)</th>
                    <th className="px-3.5 py-2.5">Line Total</th>
                    <th className="px-3.5 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--color-border]">
                  {lines.map((l, i) => (
                    <tr key={i} className="hover:bg-[--color-surface-1] transition-colors">
                      <td className="px-3.5 py-2.5">
                        <input
                          type="text"
                          value={l.part}
                          onChange={(e) => updateLinePart(i, e.target.value)}
                          placeholder="Part Name"
                          className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1 text-sm font-medium text-[--color-ink-900]"
                        />
                      </td>
                      <td className="px-3.5 py-2.5">
                        <input
                          type="number"
                          min="1"
                          value={l.quantity}
                          onChange={(e) => updateLineQty(i, Math.max(1, Number(e.target.value)))}
                          className="w-24 rounded border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1 text-sm tabular font-semibold text-[--color-ink-900]"
                        />
                      </td>
                      <td className="px-3.5 py-2.5">
                        <input
                          type="number"
                          min="0"
                          value={l.unitPrice}
                          onChange={(e) => updateLinePrice(i, Math.max(0, Number(e.target.value)))}
                          placeholder="0"
                          className="w-28 rounded border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1 text-sm tabular text-[--color-ink-900]"
                        />
                      </td>
                      <td className="px-3.5 py-2.5 tabular font-bold text-[--color-ink-900]">
                        ₹{l.totalCost.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          title="Remove item"
                          className="text-[--color-ink-400] hover:text-red-500 cursor-pointer transition-colors p-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total === 0 && lines.length > 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Tip: Unit prices can be entered above, or left as 0 and finalized upon receiving stock and vendor invoice.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[--color-ink-500]">
              Order Notes / Reference
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter purchase order notes or reference"
              className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-0] px-3 py-2 text-sm text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* BOTTOM SUBMISSION ROW */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[--color-border] pt-5">
            <div>
              <p className="text-xs font-medium text-[--color-ink-500]">Total Purchase Order Cost</p>
              <p className="text-2xl font-bold tabular text-blue-600 dark:text-blue-400">
                ₹{total.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate("/purchase-orders")}
                className="flex-1 sm:flex-none rounded-lg border border-[--color-border] px-5 py-2.5 text-sm font-medium text-[--color-ink-700] hover:bg-[--color-surface-1] transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                id="submit-po-button-bottom"
                onClick={submit}
                disabled={submitting || lines.length === 0}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold text-white shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer ${
                  isCriticalBuy ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <CheckCircle2 size={16} />
                <span>
                  {submitting
                    ? "Submitting Order…"
                    : isCriticalBuy
                    ? `Submit Critical PO (${lines.length} items)`
                    : `Submit Purchase Order (${lines.length} items)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

