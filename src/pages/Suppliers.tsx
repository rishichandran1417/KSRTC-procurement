import { useEffect, useState } from "react";
import { TopBar } from "../components/layout/TopBar";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";
import { getSuppliers, updateSupplier } from "../services/supplierApi";
import { getPurchaseOrders } from "../services/purchaseOrderApi";
import { getPriceHistory } from "../services/inventoryApi";
import type { Supplier, PriceRecord, PurchaseOrder } from "../types";
import { Phone, Mail, ChevronRight, X, Pencil } from "lucide-react";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Edit supplier state
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLeadTime, setEditLeadTime] = useState<number>(7);
  const [editReliability, setEditReliability] = useState<number>(90);
  const [editOnTime, setEditOnTime] = useState<number>(90);
  const [savingSupplier, setSavingSupplier] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    getSuppliers()
      .then(setSuppliers)
      .catch(() => setError("Could not load supplier performance data."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setEditName(s.name || "");
    setEditCategory(s.category || "");
    setEditContactName(s.contactName || "");
    setEditEmail(s.contactEmail || "");
    setEditPhone(s.contactPhone || "");
    setEditLeadTime(s.avgLeadTimeDays ?? 7);
    setEditReliability(s.reliabilityScore ?? 92);
    setEditOnTime(s.onTimeDeliveryRate ?? 95);
  };

  const handleSaveSupplier = async () => {
    if (!editingSupplier) return;
    setSavingSupplier(true);
    try {
      const updated: Supplier = {
        ...editingSupplier,
        name: editName.trim() || editingSupplier.name,
        category: editCategory.trim() || editingSupplier.category,
        contactName: editContactName.trim() || editingSupplier.contactName,
        contactEmail: editEmail.trim() || editingSupplier.contactEmail,
        contactPhone: editPhone.trim() || editingSupplier.contactPhone,
        avgLeadTimeDays: Number(editLeadTime) || 7,
        reliabilityScore: Math.min(100, Math.max(0, Number(editReliability) || 90)),
        onTimeDeliveryRate: Math.min(100, Math.max(0, Number(editOnTime) || 90)),
      };
      await updateSupplier(updated);
      setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (selectedSupplier && selectedSupplier.id === updated.id) {
        setSelectedSupplier(updated);
      }
      setEditingSupplier(null);
    } catch (err) {
      console.error("Failed to update supplier:", err);
    } finally {
      setSavingSupplier(false);
    }
  };

  return (
    <div>
      <TopBar title="Supplier Dashboard" subtitle="Who are we buying from? — Performance & delivery reliability" />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {loading ? (
          <LoadingState label="Loading registered supplier metrics…" />
        ) : error ? (
          <ErrorState title="Suppliers unavailable." message={error} onRetry={load} />
        ) : suppliers.length === 0 ? (
          <EmptyState
            title="No registered suppliers"
            message="No supplier performance data currently available. Connect your supplier database or create purchase orders."
          />
        ) : (
          <>
            {/* CARDS LIST */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {suppliers.map((s, idx) => (
                <div
                  key={`supp-card-${s.id}-${idx}`}
                  className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-4 transition-colors hover:border-[--color-border-strong]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-[--color-ink-900]">{s.name}</p>
                      <p className="text-xs text-[--color-ink-500] mt-0.5">{s.category}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(s);
                        }}
                        title="Edit Supplier"
                        className="rounded p-1 text-[--color-ink-400] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-[--color-surface-2] transition-colors cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setSelectedSupplier(s)}
                        title="View Details"
                        className="rounded p-1 text-[--color-ink-400] hover:text-[--color-ink-700] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs">
                    <Row label="Reliability Score" value={`${s.reliabilityScore ?? 92}/100`} />
                    <Row label="On-Time Delivery Rate" value={`${s.onTimeDeliveryRate ?? 95}%`} />
                    <Row label="Active Open POs" value={`${s.openOrders ?? 0} orders`} />
                    <Row label="Avg. Lead Time" value={`${s.avgLeadTimeDays ?? 7} days`} />
                  </div>
                </div>
              ))}
            </div>

            {/* COMPARISON MATRIX */}
            <div className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-4">
              <h2 className="text-xs font-medium text-[--color-ink-900] mb-3">Supplier Performance Comparison Matrix</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[620px]">
                  <thead>
                    <tr className="border-b border-[--color-border] text-left text-xs font-medium text-[--color-ink-500]">
                      <th className="py-2.5 pr-3">Supplier Name</th>
                      <th className="py-2.5 px-2">Primary Category</th>
                      <th className="py-2.5 px-2">Reliability Score</th>
                      <th className="py-2.5 px-2">On-Time Rate</th>
                      <th className="py-2.5 px-2">Average Lead Time</th>
                      <th className="py-2.5 px-2">Open Orders</th>
                      <th className="py-2.5 px-2 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--color-border]">
                    {suppliers.map((s, idx) => (
                      <tr key={`supp-row-${s.id}-${idx}`} className="hover:bg-[--color-surface-1] transition-colors">
                        <td className="py-2.5 pr-3 font-medium text-[--color-ink-900]">{s.name}</td>
                        <td className="py-2.5 px-2 text-[--color-ink-600]">{s.category}</td>
                        <td className="py-2.5 px-2 tabular font-medium text-[--color-ink-900]">{s.reliabilityScore ?? 92} / 100</td>
                        <td className="py-2.5 px-2 tabular text-[--color-ink-800]">{s.onTimeDeliveryRate ?? 95}%</td>
                        <td className="py-2.5 px-2 tabular text-[--color-ink-800]">{s.avgLeadTimeDays ?? 7} days</td>
                        <td className="py-2.5 px-2 tabular text-[--color-ink-800]">{s.openOrders ?? 0}</td>
                        <td className="py-2.5 px-2 text-right pr-2">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedSupplier(s)}
                              className="text-xs font-normal text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              View
                            </button>
                            <span className="text-[--color-ink-300]">·</span>
                            <button
                              onClick={() => openEditModal(s)}
                              className="text-xs font-normal text-[--color-ink-600] hover:text-[--color-ink-900] hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
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
        <SupplierDetailDrawer
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          onEdit={() => {
            const s = selectedSupplier;
            setSelectedSupplier(null);
            openEditModal(s);
          }}
        />
      ) : null}

      {/* EDIT SUPPLIER MODAL */}
      {editingSupplier ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
          onClick={() => setEditingSupplier(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-[--color-border] bg-[--color-surface-0] p-5 shadow-xl text-xs space-y-4 text-[--color-ink-900]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-[--color-border] pb-3">
              <div>
                <h3 className="text-sm font-medium text-[--color-ink-900]">Edit Supplier Details</h3>
                <p className="text-xs text-[--color-ink-500] mt-0.5">{editingSupplier.name}</p>
              </div>
              <button
                onClick={() => setEditingSupplier(null)}
                className="rounded p-1 text-[--color-ink-400] hover:text-[--color-ink-700] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[--color-ink-700] mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[--color-ink-700] mb-1">Primary Category</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. Brake Systems, Transmission Spares"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[--color-ink-700] mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editContactName}
                    onChange={(e) => setEditContactName(e.target.value)}
                    className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[--color-ink-700] mb-1">Avg Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={editLeadTime}
                    onChange={(e) => setEditLeadTime(Number(e.target.value))}
                    className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[--color-ink-700] mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[--color-ink-700] mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[--color-ink-700] mb-1">Reliability Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editReliability}
                    onChange={(e) => setEditReliability(Number(e.target.value))}
                    className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[--color-ink-700] mb-1">On-Time Rate % (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editOnTime}
                    onChange={(e) => setEditOnTime(Number(e.target.value))}
                    className="w-full rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[--color-border]">
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="rounded border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-normal text-[--color-ink-700] hover:bg-[--color-surface-2] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingSupplier}
                onClick={handleSaveSupplier}
                className="rounded bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {savingSupplier ? "Saving…" : "Save Details"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[--color-border] pb-1">
      <span className="text-[--color-ink-500] font-normal">{label}</span>
      <span className="tabular font-medium text-[--color-ink-900]">{value}</span>
    </div>
  );
}

function SupplierDetailDrawer({
  supplier,
  onClose,
  onEdit,
}: {
  supplier: Supplier;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    getPurchaseOrders().then((pos) => setPurchaseOrders(pos.filter((po) => po.supplier === supplier.name)));
    getPriceHistory(supplier.name).then(setPriceHistory);
  }, [supplier.name]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="h-full w-full sm:max-w-md overflow-y-auto border-l border-[--color-border] bg-[--color-surface-0] p-5 sm:p-6 space-y-4 shadow-xl text-[--color-ink-900]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[--color-border] pb-3">
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-normal">{supplier.category}</p>
            <h2 className="text-base font-medium text-[--color-ink-900] mt-0.5">{supplier.name}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded border border-[--color-border] bg-[--color-surface-1] px-2.5 py-1 text-xs font-normal text-[--color-ink-700] hover:text-[--color-ink-900] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
            >
              <Pencil size={12} />
              <span>Edit</span>
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 text-[--color-ink-400] hover:text-[--color-ink-700] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2.5">
            <p className="text-[11px] text-[--color-ink-500]">Reliability Rating</p>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-0.5">{supplier.reliabilityScore ?? 92}/100</p>
          </div>
          <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2.5">
            <p className="text-[11px] text-[--color-ink-500]">On-Time Delivery</p>
            <p className="text-sm font-medium text-[--color-ink-900] mt-0.5">{supplier.onTimeDeliveryRate ?? 95}%</p>
          </div>
          <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2.5">
            <p className="text-[11px] text-[--color-ink-500]">Avg Lead Time</p>
            <p className="text-xs font-medium text-[--color-ink-900] mt-0.5">{supplier.avgLeadTimeDays ?? 7} days</p>
          </div>
          <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-2.5">
            <p className="text-[11px] text-[--color-ink-500]">Open Orders</p>
            <p className="text-xs font-medium text-[--color-ink-900] mt-0.5">{supplier.openOrders ?? 0}</p>
          </div>
        </div>

        {/* CONTACT INFO */}
        <div className="rounded border border-[--color-border] bg-[--color-surface-1] p-3 text-xs space-y-1.5">
          <p className="font-medium text-[--color-ink-900] text-xs mb-1">Contact Details</p>
          {supplier.contactName ? (
            <p className="text-[--color-ink-700] text-xs">Officer: {supplier.contactName}</p>
          ) : null}
          {supplier.contactEmail ? (
            <div className="flex items-center gap-2 text-[--color-ink-700]">
              <Mail size={13} className="text-[--color-ink-400]" /> {supplier.contactEmail}
            </div>
          ) : null}
          {supplier.contactPhone ? (
            <div className="flex items-center gap-2 text-[--color-ink-700]">
              <Phone size={13} className="text-[--color-ink-400]" /> {supplier.contactPhone}
            </div>
          ) : null}
        </div>

        {/* PURCHASE HISTORY */}
        <div>
          <p className="mb-2 text-xs font-medium text-[--color-ink-500]">
            Purchase History ({purchaseOrders.length} orders)
          </p>
          <div className="space-y-1.5 text-xs">
            {purchaseOrders.length === 0 ? (
              <p className="text-xs text-[--color-ink-400]">No recent orders for this supplier.</p>
            ) : (
              purchaseOrders.map((po) => (
                <div key={po.poNumber} className="flex justify-between border-b border-[--color-border] pb-1.5">
                  <div>
                    <span className="font-medium text-[--color-ink-900]">{po.poNumber}</span>
                    <span className="text-[--color-ink-500]"> · {po.poDate}</span>
                  </div>
                  <span className="tabular font-medium text-[--color-ink-900]">₹{po.total.toLocaleString("en-IN")}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PRICE HISTORY */}
        <div>
          <p className="mb-2 text-xs font-medium text-[--color-ink-500]">
            Historical Offered Prices
          </p>
          <div className="space-y-1.5 text-xs">
            {priceHistory.length === 0 ? (
              <p className="text-xs text-[--color-ink-400]">No price records available.</p>
            ) : (
              priceHistory.map((ph, i) => (
                <div key={i} className="flex justify-between border-b border-[--color-border] pb-1">
                  <span className="text-[--color-ink-500]">{ph.date}</span>
                  <span className="tabular font-medium text-[--color-ink-900]">₹{ph.unitPrice}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
