import { Printer, X, Building2, CheckCircle2 } from "lucide-react";
import type { PurchaseOrder } from "../../types";

interface Props {
  po: PurchaseOrder;
  onClose: () => void;
}

export function PurchaseOrderPdfModal({ po, onClose }: Props) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = po.poDate || new Date().toISOString().slice(0, 10);
  const formattedDelivery = po.expectedDelivery || "Immediate / 7 Days";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      {/* Container */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/80 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-2 py-0.5 rounded">
              PO Preview
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-zinc-100">{po.poNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable PO Document Canvas */}
        <div className="overflow-y-auto p-6 sm:p-10 flex-1 bg-white text-slate-900 printable-document">
          <div className="space-y-6 text-sm">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="text-blue-700" size={28} />
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
                      Kerala State Road Transport Corp.
                    </h1>
                  </div>
                  <p className="text-xs font-medium text-slate-600 mt-0.5">
                    Central Stores & Supply Chain Logistics Directorate &bull; Government of Kerala
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Depot: {po.depot || "KSRTC Central Stores & Workshop"}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="inline-block px-2.5 py-1 text-xs font-bold uppercase rounded bg-slate-900 text-white tracking-widest">
                    Purchase Order
                  </span>
                  <p className="text-base font-extrabold text-blue-900 mt-1">{po.poNumber}</p>
                  <p className="text-xs text-slate-600">PO Date: <strong>{formattedDate}</strong></p>
                  <p className="text-xs text-slate-600">Expected: <strong>{formattedDelivery}</strong></p>
                </div>
              </div>
            </div>

            {/* Vendor & Delivery Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Vendor / Supplier</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{po.supplier || "KSRTC Authorized Vendor"}</p>
                <p className="text-xs text-slate-600 mt-0.5">Approved Commercial Parts Supplier</p>
                <p className="text-xs text-slate-500 mt-1">Payment Terms: 30 Days Net from GRN Acceptance</p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Deliver To / Consignee</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{po.depot || "KSRTC Central Stores Depot"}</p>
                <p className="text-xs text-slate-600 mt-0.5">Material Receipt & Inspection Cell</p>
                <p className="text-xs text-slate-500 mt-1">Status: <strong className="text-emerald-700">{po.status || "Submitted"}</strong></p>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Description / Part Name</th>
                    <th className="py-2.5 px-3 text-center w-24">Qty</th>
                    <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
                    <th className="py-2.5 px-3 text-right w-32">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {po.lines && po.lines.length > 0 ? (
                    po.lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{line.part}</td>
                        <td className="py-2 px-3 text-center font-bold">{line.quantity}</td>
                        <td className="py-2 px-3 text-right tabular text-slate-700">₹{(line.unitPrice || 0).toLocaleString("en-IN")}</td>
                        <td className="py-2 px-3 text-right tabular font-bold text-slate-900">
                          ₹{((line.quantity || 1) * (line.unitPrice || 0)).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        No itemized lines recorded for this order.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold text-slate-900">
                    <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-xs">
                      Grand Total Amount:
                    </td>
                    <td className="py-2.5 px-3 text-right tabular text-sm text-blue-900">
                      ₹{po.total.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes / Special Instructions */}
            {po.notes && (
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="font-bold text-slate-700">Order Notes / Reference:</p>
                <p className="text-slate-600 mt-0.5">{po.notes}</p>
              </div>
            )}

            {/* Terms and Signatures */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px] text-slate-500">
              <div>
                <p className="font-bold text-slate-700 uppercase tracking-wider">Terms & Conditions:</p>
                <ol className="list-decimal pl-4 space-y-0.5 mt-1">
                  <li>Goods subject to depot quality inspection and barcode verification.</li>
                  <li>Delivered spare parts must strictly comply with OEM specifications.</li>
                  <li>Original invoice & delivery challan must accompany shipment.</li>
                </ol>
              </div>

              <div className="flex flex-col justify-end text-right">
                <div className="border-b border-slate-400 w-44 ml-auto mb-1"></div>
                <p className="font-bold text-slate-800 text-xs">Authorized Signatory</p>
                <p className="text-[10px] text-slate-500">KSRTC Materials & Procurement Division</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info (no-print) */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 no-print">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 size={14} /> Ready for print / PDF export
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 cursor-pointer font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
