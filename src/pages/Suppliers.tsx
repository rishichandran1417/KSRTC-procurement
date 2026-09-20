import { useEffect, useState } from "react";
import { TopBar } from "../components/layout/TopBar";
import { LoadingState, ErrorState } from "../components/ui/States";
import { getSuppliers } from "../services/supplierApi";
import { mockPriceHistory } from "../mock/inventory";
import { MOCK_PURCHASE_ORDERS } from "../mock/purchaseOrders";
import type { Supplier, PriceRecord, PurchaseOrder } from "../types";
import { Phone, Mail, ChevronRight, X } from "lucide-react";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getSuppliers().then(setSuppliers).catch(() => setError("Could not load supplier performance data.")).finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <TopBar title="Supplier Dashboard" subtitle="Who are we buying from? — Performance & delivery reliability" />

      <div className="p-6 space-y-6">
        {loading ? (
          <LoadingState label="Loading registered supplier metrics…" />
        ) : error ? (
          <ErrorState title="Suppliers unavailable." message={error} onRetry={load} />
        ) : (
          <>
            {/* CARDS LIST */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSupplier(s)}
                  className="cursor-pointer rounded-md border border-[--color-border] bg-[--color-surface-0] p-4 transition-colors hover:border-[--color-forecast-500]/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-[--color-ink-900]">{s.name}</p>
                      <p className="text-xs text-[--color-ink-500]">{s.category}</p>
                    </div>
                    <ChevronRight size={16} className="text-[--color-ink-400]" />
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <Row label="Reliability Score" value={`${s.reliabilityScore}/100`} highlight={s.reliabilityScore >= 90} />
                    <Row label="On-Time Delivery Rate" value={`${s.onTimeDeliveryRate}%`} highlight={s.onTimeDeliveryRate >= 90} />
                    <Row label="Active Open POs" value={`${s.openOrders} orders`} />
                    <Row label="Avg. Lead Time" value={`${s.avgLeadTimeDays} days`} />
                  </div>
                </div>
              ))}
            </div>

            {/* COMPARISON MATRIX */}
            <div className="rounded-md border border-[--color-border] bg-[--color-surface-0] p-4">
              <h2 className="text-sm font-semibold text-[--color-ink-900] mb-3">Supplier Performance Comparison Matrix</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[--color-border] text-left uppercase text-[--color-ink-500]">
                      <th className="py-2 pr-3">Supplier Name</th>
                      <th className="py-2 px-2">Primary Category</th>
                      <th className="py-2 px-2">Reliability Score</th>
                      <th className="py-2 px-2">On-Time Rate</th>
                      <th className="py-2 px-2">Average Lead Time</th>
                      <th className="py-2 px-2">Open Orders</th>
                      <th className="py-2 px-2 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <tr key={s.id} className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface-1]">
                        <td className="py-2.5 pr-3 font-semibold text-[--color-ink-900]">{s.name}</td>
                        <td className="py-2.5 px-2 text-[--color-ink-700]">{s.category}</td>
                        <td className="py-2.5 px-2 tabular font-semibold text-[--color-forecast-600]">{s.reliabilityScore} / 100</td>
                        <td className="py-2.5 px-2 tabular font-semibold">{s.onTimeDeliveryRate}%</td>
                        <td className="py-2.5 px-2 tabular">{s.avgLeadTimeDays} days</td>
                        <td className="py-2.5 px-2 tabular">{s.openOrders}</td>
                        <td className="py-2.5 px-2 text-right pr-2">
                          <button
                            onClick={() => setSelectedSupplier(s)}
                            className="text-xs font-medium text-[--color-forecast-600] hover:underline"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* SUPPLIER DETAILS DRAWER */}
      {selectedSupplier ? (
        <SupplierDetailDrawer supplier={selectedSupplier} onClose={() => setSelectedSupplier(null)} />
      ) : null}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between border-b border-[--color-border] pb-1">
      <span className="text-[--color-ink-500]">{label}</span>
      <span className={`tabular font-medium ${highlight ? "text-[--color-forecast-600] font-semibold" : "text-[--color-ink-900]"}`}>
        {value}
      </span>
    </div>
  );
}

function SupplierDetailDrawer({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const priceHistory: PriceRecord[] = mockPriceHistory("Brake Pad").filter((p) => p.supplier === supplier.name || true);
  const purchaseOrders: PurchaseOrder[] = MOCK_PURCHASE_ORDERS.filter((po) => po.supplier === supplier.name);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-[--color-border] bg-[--color-surface-0] p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[--color-border] pb-3">
          <div>
            <p className="text-xs text-[--color-forecast-600] font-semibold uppercase">{supplier.category}</p>
            <h2 className="text-lg font-bold text-[--color-ink-900]">{supplier.name}</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-[--color-ink-500] hover:bg-[--color-surface-1]">
            <X size={18} />
          </button>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2.5">
            <p className="text-[10px] text-[--color-ink-500]">Reliability Rating</p>
            <p className="text-base font-bold text-[--color-forecast-600]">{supplier.reliabilityScore}/100</p>
          </div>
          <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2.5">
            <p className="text-[10px] text-[--color-ink-500]">On-Time Delivery</p>
            <p className="text-base font-bold text-[--color-ink-900]">{supplier.onTimeDeliveryRate}%</p>
          </div>
          <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2.5">
            <p className="text-[10px] text-[--color-ink-500]">Avg Lead Time</p>
            <p className="text-sm font-semibold text-[--color-ink-900]">{supplier.avgLeadTimeDays} days</p>
          </div>
          <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2.5">
            <p className="text-[10px] text-[--color-ink-500]">Open Orders</p>
            <p className="text-sm font-semibold text-[--color-ink-900]">{supplier.openOrders}</p>
          </div>
        </div>

        {/* CONTACT INFO */}
        <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-3 text-xs space-y-1.5">
          <p className="font-semibold text-[--color-ink-900] uppercase text-[10px] tracking-wider mb-1">Contact Details</p>
          {supplier.contactEmail ? (
            <div className="flex items-center gap-2 text-[--color-ink-700]">
              <Mail size={14} className="text-[--color-ink-400]" /> {supplier.contactEmail}
            </div>
          ) : null}
          {supplier.contactPhone ? (
            <div className="flex items-center gap-2 text-[--color-ink-700]">
              <Phone size={14} className="text-[--color-ink-400]" /> {supplier.contactPhone}
            </div>
          ) : null}
        </div>

        {/* PURCHASE HISTORY */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[--color-ink-500]">
            Purchase History with Supplier ({purchaseOrders.length} orders)
          </p>
          <div className="space-y-1.5 text-xs">
            {purchaseOrders.length === 0 ? (
              <p className="text-xs text-[--color-ink-500]">No recent orders for this supplier.</p>
            ) : (
              purchaseOrders.map((po) => (
                <div key={po.poNumber} className="flex justify-between border-b border-[--color-border] pb-1.5">
                  <div>
                    <span className="font-medium text-[--color-ink-900]">{po.poNumber}</span>
                    <span className="text-[--color-ink-500]"> · {po.poDate}</span>
                  </div>
                  <span className="tabular font-semibold">₹{po.total.toLocaleString("en-IN")}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PRICE HISTORY */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[--color-ink-500]">
            Historical Offered Prices
          </p>
          <div className="space-y-1.5 text-xs">
            {priceHistory.map((ph, i) => (
              <div key={i} className="flex justify-between border-b border-[--color-border] pb-1">
                <span className="text-[--color-ink-500]">{ph.date}</span>
                <span className="tabular font-medium text-[--color-ink-900]">₹{ph.unitPrice}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
