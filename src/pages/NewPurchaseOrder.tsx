import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { SINGLE_DEPOT_NAME } from "../state/FiltersContext";
import { createPurchaseOrder } from "../services/purchaseOrderApi";
import type { ProcurementItem, PurchaseOrder, PurchaseOrderLine } from "../types";


interface NavState {
  items?: ProcurementItem[];
}

export default function NewPurchaseOrder() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as NavState | null) ?? {};
  const prefilledItems = state.items || [];

  const [lines, setLines] = useState<PurchaseOrderLine[]>(
    prefilledItems.length > 0
      ? prefilledItems.map((i) => ({ part: i.part, quantity: i.quantity, unitPrice: i.unit_price, totalCost: i.total_cost }))
      : [{ part: "", quantity: 1, unitPrice: 0, totalCost: 0 }]
  );

  const [supplier, setSupplier] = useState(prefilledItems[0]?.supplier ?? "");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState(
    prefilledItems.length > 0 ? "Pre-populated from PuLP Optimization Model Recommendation" : ""
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
      supplier,
      depot: SINGLE_DEPOT_NAME,
      poDate: new Date().toISOString().slice(0, 10),
      expectedDelivery,
      total,
      status: "Submitted",
      lines,
      notes,
    };
    createPurchaseOrder(po).then(() => {
      setSubmitting(false);
      navigate("/purchase-orders");
    });
  };

  return (
    <div>
      <TopBar title="Create Purchase Order" subtitle="What did we order? — Review and submit purchase order" />

      <div className="p-4 sm:p-6 max-w-4xl">
        {prefilledItems.length > 0 ? (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-[--color-forecast-500]/30 bg-[--color-forecast-500]/10 p-3 text-xs text-[--color-forecast-700]">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Form auto-populated with <strong>{prefilledItems.length} items</strong> from PuLP Optimization Model. You can review and adjust quantities and unit prices below.</span>
          </div>
        ) : null}

        <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[--color-ink-500]">Supplier Name</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Enter supplier name"
                className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm font-medium text-[--color-ink-900]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[--color-ink-500]">Expected Delivery Date</label>
              <input
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
                className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[--color-ink-500]">Order Line Items</label>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 text-xs font-medium text-[--color-forecast-600] hover:underline"
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            <div className="overflow-x-auto rounded border border-[--color-border]">
              <table className="w-full text-sm min-w-[550px]">
                <thead>
                  <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left text-xs uppercase tracking-wider text-[--color-ink-500]">
                    <th className="px-3 py-2">Part / Item</th>
                    <th className="px-3 py-2">Quantity</th>
                    <th className="px-3 py-2">Unit Price (₹)</th>
                    <th className="px-3 py-2">Line Total</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="border-b border-[--color-border] last:border-0">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={l.part}
                          onChange={(e) => updateLinePart(i, e.target.value)}
                          placeholder="Part Name"
                          className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-2 py-1 text-sm font-medium"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={l.quantity}
                          onChange={(e) => updateLineQty(i, Number(e.target.value))}
                          className="w-24 rounded border border-[--color-border] px-2 py-1 text-sm tabular font-semibold"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={l.unitPrice}
                          onChange={(e) => updateLinePrice(i, Number(e.target.value))}
                          className="w-28 rounded border border-[--color-border] px-2 py-1 text-sm tabular"
                        />
                      </td>
                      <td className="px-3 py-2 tabular font-semibold text-[--color-ink-900]">
                        ₹{l.totalCost.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          className="text-[--color-ink-400] hover:text-[--color-critical-500]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[--color-ink-500]">Order Notes / Reference</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter purchase order notes or reference"
              className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[--color-border] pt-4">
            <div>
              <p className="text-xs text-[--color-ink-500]">Total Purchase Order Cost</p>
              <p className="text-xl font-bold tabular text-[--color-forecast-600]">₹{total.toLocaleString("en-IN")}</p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate("/purchase-orders")}
                className="flex-1 sm:flex-none rounded border border-[--color-border] px-4 py-2 text-sm text-[--color-ink-700] hover:bg-[--color-surface-1]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || lines.length === 0}
                className="flex-1 sm:flex-none rounded bg-[--color-forecast-500] px-5 py-2 text-sm font-medium text-white hover:bg-[--color-forecast-700] disabled:opacity-50"
              >
                {submitting ? "Submitting Order…" : "Submit Purchase Order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
