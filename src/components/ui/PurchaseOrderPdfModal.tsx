import { Printer, X, Building2, CheckCircle2 } from "lucide-react";
import type { PurchaseOrder } from "../../types";

interface Props {
  po: PurchaseOrder;
  onClose: () => void;
}

export function PurchaseOrderPdfModal({ po, onClose }: Props) {
  const formattedDate = po.poDate || new Date().toISOString().slice(0, 10);
  const formattedDelivery = po.expectedDelivery || "Immediate / 7 Days";

  const handlePrint = () => {
    // Dedicated isolated printable iframe to guarantee sharp, clean PDF rendering
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${po.poNumber} - KSRTC Purchase Order</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 15mm 18mm;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #0f172a;
                background: #ffffff;
                font-size: 13px;
                line-height: 1.5;
                padding: 10px;
              }
              .header {
                border-bottom: 1px solid #cbd5e1;
                padding-bottom: 14px;
                margin-bottom: 18px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
              }
              .org-title {
                font-size: 16px;
                font-weight: 600;
                color: #0f172a;
              }
              .org-sub {
                font-size: 11px;
                color: #475569;
                margin-top: 2px;
              }
              .badge-po {
                background: #f8fafc;
                color: #334155;
                font-size: 11px;
                font-weight: 500;
                padding: 3px 8px;
                border-radius: 4px;
                border: 1px solid #cbd5e1;
                display: inline-block;
              }
              .po-num {
                font-size: 14px;
                font-weight: 600;
                color: #0f172a;
                margin-top: 4px;
              }
              .meta-text {
                font-size: 11px;
                color: #475569;
              }
              .grid-box {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 12px 14px;
                margin-bottom: 20px;
              }
              .box-title {
                font-size: 11px;
                font-weight: 500;
                color: #64748b;
                margin-bottom: 3px;
              }
              .box-val {
                font-size: 13px;
                font-weight: 600;
                color: #0f172a;
              }
              .box-desc {
                font-size: 11px;
                color: #475569;
                margin-top: 2px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                font-size: 12px;
              }
              th {
                background: #f8fafc;
                color: #475569;
                font-weight: 500;
                font-size: 11px;
                padding: 8px 10px;
                border: 1px solid #e2e8f0;
                text-align: left;
              }
              td {
                padding: 8px 10px;
                border: 1px solid #e2e8f0;
                color: #1e293b;
              }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              tfoot td {
                background: #f8fafc;
                border-top: 1px solid #cbd5e1;
                font-weight: 600;
              }
              .notes-box {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 10px 12px;
                margin-bottom: 24px;
                font-size: 11px;
              }
              .sign-row {
                margin-top: 36px;
                display: flex;
                justify-content: flex-end;
              }
              .sign-box {
                width: 200px;
                text-align: right;
              }
              .sign-line {
                border-bottom: 1px solid #94a3b8;
                margin-bottom: 6px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="org-title">Kerala State Road Transport Corporation</div>
                <div class="org-sub">Central Stores & Supply Chain Logistics Directorate · Government of Kerala</div>
                <div class="meta-text" style="margin-top: 4px;">Depot: ${po.depot || "KSRTC Central Stores & Workshop"}</div>
              </div>
              <div style="text-align: right;">
                <div class="badge-po">Purchase Order</div>
                <div class="po-num">${po.poNumber}</div>
                <div class="meta-text">Date: ${formattedDate}</div>
                <div class="meta-text">Expected: ${formattedDelivery}</div>
              </div>
            </div>

            <div class="grid-box">
              <div>
                <div class="box-title">Vendor / Supplier</div>
                <div class="box-val">${po.supplier || "KSRTC Authorized Vendor"}</div>
                <div class="box-desc">Approved Commercial Parts Supplier</div>
                <div class="box-desc" style="color: #64748b;">Terms: 30 Days Net from GRN Acceptance</div>
              </div>
              <div>
                <div class="box-title">Deliver To / Consignee</div>
                <div class="box-val">${po.depot || "KSRTC Central Stores Depot"}</div>
                <div class="box-desc">Material Receipt & Inspection Cell</div>
                <div class="box-desc" style="color: #2563eb;">Status: ${po.status || "Submitted"}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 36px; text-align: center;">#</th>
                  <th>Description / Part Name</th>
                  <th style="width: 70px; text-align: center;">Qty</th>
                  <th style="width: 100px; text-align: right;">Unit Price (₹)</th>
                  <th style="width: 110px; text-align: right;">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${
                  po.lines && po.lines.length > 0
                    ? po.lines
                        .map(
                          (line, idx) => `
                        <tr>
                          <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                          <td style="font-weight: 500;">${line.part}</td>
                          <td style="text-align: center;">${line.quantity}</td>
                          <td style="text-align: right;">₹${(line.unitPrice || 0).toLocaleString("en-IN")}</td>
                          <td style="text-align: right; font-weight: 500;">₹${((line.quantity || 1) * (line.unitPrice || 0)).toLocaleString("en-IN")}</td>
                        </tr>
                      `
                        )
                        .join("")
                    : `<tr><td colspan="5" style="text-align: center; padding: 16px; color: #94a3b8;">No itemized lines recorded for this order.</td></tr>`
                }
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" style="text-align: right; font-size: 11px; color: #475569;">Total Amount:</td>
                  <td style="text-align: right; font-size: 13px; font-weight: 600; color: #0f172a;">₹${po.total.toLocaleString("en-IN")}</td>
                </tr>
              </tfoot>
            </table>

            ${
              po.notes
                ? `
              <div class="notes-box">
                <div style="font-weight: 600; color: #334155; margin-bottom: 2px;">Order Notes:</div>
                <div style="color: #475569;">${po.notes}</div>
              </div>
            `
                : ""
            }

            <div class="sign-row">
              <div class="sign-box">
                <div class="sign-line"></div>
                <div style="font-size: 11px; font-weight: 600; color: #1e293b;">Authorized Signatory</div>
                <div style="font-size: 10px; color: #64748b;">KSRTC Materials & Procurement Division</div>
              </div>
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 3000);
      }, 250);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto po-modal-overlay">
      {/* Container */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden my-auto max-h-[95vh] flex flex-col po-modal-container">
        {/* Modal Controls Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/80 no-print">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-300">
              Purchase Order Preview
            </span>
            <span className="text-xs font-normal text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-800 dark:text-zinc-200">{po.poNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-medium shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Printer size={13} />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable PO Document Canvas */}
        <div id="po-printable-area" className="overflow-y-auto p-6 sm:p-8 flex-1 bg-white text-slate-900 printable-document">
          <div className="space-y-5 text-sm">
            {/* Header */}
            <div className="border-b border-slate-300 pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="text-blue-700" size={22} />
                    <h1 className="text-base font-semibold text-slate-900">
                      Kerala State Road Transport Corporation
                    </h1>
                  </div>
                  <p className="text-xs font-normal text-slate-600 mt-0.5">
                    Central Stores & Supply Chain Logistics Directorate · Government of Kerala
                  </p>
                  <p className="text-xs text-slate-500">
                    Depot: {po.depot || "KSRTC Central Stores & Workshop"}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded border border-slate-300 bg-slate-50 text-slate-700">
                    Purchase Order
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{po.poNumber}</p>
                  <p className="text-xs text-slate-600">PO Date: <span>{formattedDate}</span></p>
                  <p className="text-xs text-slate-600">Expected: <span>{formattedDelivery}</span></p>
                </div>
              </div>
            </div>

            {/* Vendor & Delivery Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border border-slate-200 bg-slate-50/70 p-3.5">
              <div>
                <p className="text-xs font-medium text-slate-500">Vendor / Supplier</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{po.supplier || "KSRTC Authorized Vendor"}</p>
                <p className="text-xs text-slate-600 mt-0.5">Approved Commercial Parts Supplier</p>
                <p className="text-xs text-slate-500 mt-0.5">Payment Terms: 30 Days Net from GRN Acceptance</p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Deliver To / Consignee</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{po.depot || "KSRTC Central Stores Depot"}</p>
                <p className="text-xs text-slate-600 mt-0.5">Material Receipt & Inspection Cell</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Status: <span className="font-medium text-blue-700">{po.status || "Submitted"}</span>
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <th className="py-2 px-3 w-10 text-center">#</th>
                    <th className="py-2 px-3">Description / Part Name</th>
                    <th className="py-2 px-3 text-center w-20">Qty</th>
                    <th className="py-2 px-3 text-right w-24">Unit Price</th>
                    <th className="py-2 px-3 text-right w-28">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {po.lines && po.lines.length > 0 ? (
                    po.lines.map((line, idx) => (
                      <tr key={`po-line-${idx}`} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{line.part}</td>
                        <td className="py-2 px-3 text-center">{line.quantity}</td>
                        <td className="py-2 px-3 text-right tabular text-slate-700">₹{(line.unitPrice || 0).toLocaleString("en-IN")}</td>
                        <td className="py-2 px-3 text-right tabular font-medium text-slate-900">
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
                  <tr className="border-t border-slate-300 bg-slate-50 font-medium text-slate-800">
                    <td colSpan={4} className="py-2 px-3 text-right text-xs">
                      Grand Total Amount:
                    </td>
                    <td className="py-2 px-3 text-right tabular text-sm font-semibold text-slate-900">
                      ₹{po.total.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes / Special Instructions */}
            {po.notes && (
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="font-medium text-slate-700">Order Notes / Reference:</p>
                <p className="text-slate-600 mt-0.5">{po.notes}</p>
              </div>
            )}

            {/* Authorized Signatory */}
            <div className="pt-5 border-t border-slate-200 flex justify-end text-right">
              <div className="w-48">
                <div className="border-b border-slate-400 w-full mb-1"></div>
                <p className="font-medium text-slate-800 text-xs">Authorized Signatory</p>
                <p className="text-[10px] text-slate-500">KSRTC Materials & Procurement Division</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info (no-print) */}
        <div className="px-5 py-2.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 no-print">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-normal">
            <CheckCircle2 size={13} /> Ready for print / PDF export
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 rounded-md border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 cursor-pointer font-normal text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
