import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Plus, Trash2, CheckCircle2, AlertTriangle, ArrowLeft, FileText,
  MapPin, Check, ChevronDown, Building2
} from "lucide-react";
import { TopBar } from "../components/layout/TopBar";
import { SINGLE_DEPOT_NAME } from "../state/FiltersContext";
import { createPurchaseOrder, getNextPoNumber, getPurchaseOrders } from "../services/purchaseOrderApi";
import { getSuppliers, DEFAULT_KSRTC_SUPPLIERS } from "../services/supplierApi";
import { getInventory, DEFAULT_KSRTC_PARTS } from "../services/inventoryApi";
import { PurchaseOrderPdfModal } from "../components/ui/PurchaseOrderPdfModal";
import type { ProcurementItem, PurchaseOrder, PurchaseOrderLine, Supplier, InventoryItem } from "../types";

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

  const [poNumber, setPoNumber] = useState(`KSRTC/PO/${new Date().getFullYear()}/03282`);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>(DEFAULT_KSRTC_SUPPLIERS);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>(DEFAULT_KSRTC_PARTS);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryPart = searchParams.get("part") || "";
  const querySupplier = searchParams.get("supplier") || "";
  const queryCost = Number(searchParams.get("cost") || 0);
  const queryQty = Number(searchParams.get("qty") || 1);

  const initialSupplier =
    querySupplier ||
    prefilledItems[0]?.supplier ||
    (isCriticalBuy ? "KSRTC Central Stores / Urgent Vendor" : "");

  const [supplier, setSupplier] = useState(initialSupplier);
  const [supplierAddress, setSupplierAddress] = useState(() => {
    if (!initialSupplier) return "";
    const found = DEFAULT_KSRTC_SUPPLIERS.find(
      (s) => s.name.toLowerCase() === initialSupplier.toLowerCase()
    );
    return found?.address || "";
  });
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [activePartDropdown, setActivePartDropdown] = useState<number | null>(null);
  const [activeCategoryDropdown, setActiveCategoryDropdown] = useState<number | null>(null);

  const [expectedDelivery, setExpectedDelivery] = useState(
    new Date(Date.now() + (isCriticalBuy || queryPart ? 4 : 7) * 86400000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(
    state.notes ||
      (queryPart
        ? `Fast-Track Procurement authorized via KSRTC SCION Copilot recommendation.`
        : isCriticalBuy
        ? "Emergency Critical Stockout Procurement (Critical Buy)"
        : prefilledItems.length > 0
        ? "Pre-populated from PuLP Optimization Model Recommendation"
        : "")
  );

  const [lines, setLines] = useState<PurchaseOrderLine[]>(() => {
    if (queryPart) {
      const matched = DEFAULT_KSRTC_PARTS.find(
        (p) => p.part.toLowerCase() === queryPart.toLowerCase()
      );
      const unitPrice = queryCost || matched?.unitCost || 0;
      const quantity = queryQty || 1;
      return [
        {
          part: queryPart,
          category: matched?.category || "HVAC & Climate Control",
          quantity,
          unitPrice,
          totalCost: quantity * unitPrice,
        },
      ];
    }
    if (prefilledItems.length > 0) {
      return prefilledItems.map((i) => {
        const matched = DEFAULT_KSRTC_PARTS.find(
          (p) => p.part.toLowerCase() === i.part.toLowerCase()
        );
        return {
          part: i.part,
          category: matched?.category || "",
          quantity: i.quantity,
          unitPrice: i.unit_price || matched?.unitCost || 0,
          totalCost: (i.quantity || 1) * (i.unit_price || matched?.unitCost || 0),
        };
      });
    }
    return [{ part: "", category: "", quantity: 1, unitPrice: 0, totalCost: 0 }];
  });

  const [submitting, setSubmitting] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  const supplierContainerRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Derived list of all standard categories for suggestions
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    inventoryList.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    [
      "Brake Systems",
      "Transmission & Powertrain",
      "Filters & Lubrication",
      "Tyres & Rubber",
      "Electrical Components & Sensors",
      "Suspension & Steering",
      "Engine & Cooling",
      "Hardware & Fasteners",
      "Body & Glass",
      "Oils, Lubricants & Greases",
    ].forEach((c) => set.add(c));
    return Array.from(set);
  }, [inventoryList]);

  // Load PO number, suppliers, and inventory for autocompletion
  useEffect(() => {
    getPurchaseOrders().then((orders) => {
      const next = getNextPoNumber(orders);
      setPoNumber(next);
    });

    getSuppliers().then((sups) => {
      setSuppliersList(sups);
      if (supplier) {
        const found = sups.find((s) => s.name.toLowerCase() === supplier.toLowerCase());
        if (found?.address) {
          setSupplierAddress(found.address);
        }
      }
    });

    getInventory().then((inv) => {
      setInventoryList(inv);
    });
  }, []);

  // Dismiss dropdowns when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (supplierContainerRef.current && !supplierContainerRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false);
      }
      if (tableContainerRef.current && !tableContainerRef.current.contains(e.target as Node)) {
        setActivePartDropdown(null);
        setActiveCategoryDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  // Filter matching suppliers
  const filteredSuppliers = useMemo(() => {
    const q = supplier.trim().toLowerCase();
    if (!q) return suppliersList.slice(0, 8);
    return suppliersList
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.category && s.category.toLowerCase().includes(q)) ||
          (s.address && s.address.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [suppliersList, supplier]);

  // Select supplier handler
  const handleSelectSupplier = (s: Supplier) => {
    setSupplier(s.name);
    if (s.address) {
      setSupplierAddress(s.address);
    }
    setShowSupplierDropdown(false);
  };

  // Filter matching parts for a specific line item
  const getMatchingParts = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return inventoryList.slice(0, 10);
    return inventoryList
      .filter(
        (item) =>
          item.part.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q))
      )
      .slice(0, 10);
  };

  // Filter matching categories for a specific line item
  const getMatchingCategories = (query: string) => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return availableCategories;
    return availableCategories.filter((c) => c.toLowerCase().includes(q));
  };

  const handleSelectPart = (idx: number, item: InventoryItem) => {
    setLines((prev) => {
      const updated = [...prev];
      const cur = updated[idx];
      const qty = Number(cur.quantity) || 1;
      const price = item.unitCost || cur.unitPrice || 0;
      updated[idx] = {
        ...cur,
        part: item.part,
        category: item.category || cur.category || "",
        unitPrice: price,
        totalCost: qty * price,
      };
      return updated;
    });
    setActivePartDropdown(null);
  };

  const handleSelectCategory = (idx: number, category: string) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], category };
      return updated;
    });
    setActiveCategoryDropdown(null);
  };

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

  const updateLineCategory = (idx: number, category: string) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, category } : l))
    );
  };

  const updateLinePart = (idx: number, partName: string) => {
    setLines((prev) => {
      const updated = [...prev];
      const cur = updated[idx];
      const matched = inventoryList.find(
        (item) => item.part.toLowerCase() === partName.trim().toLowerCase()
      );
      const price: number = (matched && typeof matched.unitCost === "number" && matched.unitCost > 0)
        ? matched.unitCost
        : (cur.unitPrice || 0);
      const resolvedName = matched ? matched.part : partName;
      const resolvedCategory = matched?.category || cur.category || "";
      updated[idx] = {
        ...cur,
        part: resolvedName,
        category: resolvedCategory,
        unitPrice: price,
        totalCost: (Number(cur.quantity) || 1) * price,
      };
      return updated;
    });
  };

  const addLine = () => {
    setLines((prev) => [...prev, { part: "", category: "", quantity: 1, unitPrice: 0, totalCost: 0 }]);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const total = lines.reduce((sum, l) => sum + l.totalCost, 0);

  const submit = () => {
    const validLines = lines.filter((l) => l.part.trim().length > 0);
    if (validLines.length === 0) {
      alert("Please enter a part name for at least one line item.");
      return;
    }
    setSubmitting(true);
    const resolvedPoNumber = poNumber.trim() || getNextPoNumber();
    const po: PurchaseOrder = {
      poNumber: resolvedPoNumber,
      supplier: supplier.trim() || (isCriticalBuy ? "Emergency Procurement Vendor" : "KSRTC Central Stores"),
      supplierAddress: supplierAddress.trim() || undefined,
      depot: SINGLE_DEPOT_NAME,
      poDate: new Date().toISOString().slice(0, 10),
      expectedDelivery,
      total,
      status: "Submitted",
      lines: validLines.map((l) => ({
        part: l.part.trim(),
        category: l.category?.trim() || undefined,
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
        totalCost: (Number(l.quantity) || 1) * (Number(l.unitPrice) || 0),
      })),
      notes,
      isNew: true,
      createdAt: Date.now(),
    };
    createPurchaseOrder(po)
      .then(() => {
        setSubmitting(false);
        navigate("/purchase-orders");
      })
      .catch((err) => {
        console.error("Error creating PO:", err);
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
              onClick={() => setShowPdf(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[--color-border] bg-[--color-surface-1] hover:bg-[--color-surface-2] px-3 py-1.5 text-xs font-semibold text-[--color-ink-700] hover:text-[--color-ink-900] active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <FileText size={13} className="text-blue-600 dark:text-blue-400" />
              <span>View PDF</span>
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
          {/* TOP GRID: PO Number & Delivery Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[--color-ink-500]">
                  PO Number
                </label>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Auto-generated</span>
              </div>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. KSRTC/PO/2026/03282"
                className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-0] px-3 py-2 text-sm font-medium font-mono text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
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

          {/* SUPPLIER NAME & ADDRESS SECTION */}
          <div className="rounded-xl border border-[--color-border] bg-[--color-surface-1]/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[--color-ink-700] flex items-center gap-1.5">
                <Building2 size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Supplier & Dispatch Details</span>
              </span>
              {supplierAddress ? (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check size={12} /> Address auto-filled from vendor master
                </span>
              ) : (
                <span className="text-[10px] text-[--color-ink-400]">Select a supplier below to auto-fill address</span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* SUPPLIER NAME WITH AUTOCOMPLETE */}
              <div ref={supplierContainerRef} className="relative">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[--color-ink-500] flex items-center justify-between">
                  <span>Supplier Name *</span>
                  {supplier && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">Approved KSRTC Vendor</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    autoComplete="off"
                    value={supplier}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSupplier(val);
                      setShowSupplierDropdown(true);
                      const matched = suppliersList.find((s) => s.name.toLowerCase() === val.trim().toLowerCase());
                      if (matched?.address) {
                        setSupplierAddress(matched.address);
                      }
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    placeholder="Type to search standard suppliers…"
                    className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-0] px-3 py-2 text-sm font-medium text-[--color-ink-900] focus:border-blue-500 focus:outline-none pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                    className="absolute right-2 top-2.5 text-[--color-ink-400] hover:text-[--color-ink-700] transition-colors cursor-pointer"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* SUPPLIER DROPDOWN POPUP */}
                {showSupplierDropdown && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[--color-border] bg-[--color-surface-0] shadow-2xl py-1 text-xs">
                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[--color-ink-400] bg-[--color-surface-1] border-b border-[--color-border] flex items-center justify-between">
                      <span>Registered Vendors ({filteredSuppliers.length})</span>
                      <span className="text-[10px] font-normal text-blue-600 dark:text-blue-400">Click to fill</span>
                    </div>
                    {filteredSuppliers.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-[--color-ink-400] italic">
                        No matching registered suppliers. You can keep typing custom supplier name.
                      </div>
                    ) : (
                      filteredSuppliers.map((s) => (
                        <button
                          key={s.id || s.name}
                          type="button"
                          onClick={() => handleSelectSupplier(s)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-b border-[--color-border] last:border-0 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-xs text-[--color-ink-900] group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {s.name}
                            </p>
                            <span className="rounded bg-[--color-surface-2] px-1.5 py-0.2 text-[10px] font-medium text-[--color-ink-600] shrink-0">
                              {s.category}
                            </span>
                          </div>
                          {s.address && (
                            <p className="text-[11px] text-[--color-ink-500] truncate mt-0.5 flex items-center gap-1">
                              <MapPin size={10} className="shrink-0 text-[--color-ink-400]" />
                              <span>{s.address}</span>
                            </p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* SUPPLIER ADDRESS (AUTO-FILLED & EDITABLE) */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[--color-ink-500] flex items-center gap-1">
                  <MapPin size={11} className="text-blue-600 dark:text-blue-400" />
                  <span>Supplier Address (Auto-filled)</span>
                </label>
                <textarea
                  rows={2}
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="Auto-fills upon choosing supplier, or type full postal address..."
                  className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-0] px-3 py-2 text-xs font-medium text-[--color-ink-900] focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* LINE ITEMS TABLE WITH PART NAME AUTOCOMPLETE */}
          <div>
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[--color-ink-500]">
                  Order Line Items ({lines.length})
                </label>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-900/60 font-medium">
                  Auto-suggests Uniform Spares & Cost
                </span>
              </div>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            {/* QUICK-ADD POPULAR KSRTC SPARES BAR */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[--color-ink-400] shrink-0">
                Quick Add:
              </span>
              {[
                "Brake Lining Set (Leyland Viking / Cheetah)",
                "Clutch Plate Assembly 380mm (Organic)",
                "Engine Oil Filter Spin-On",
                "Primary Fuel Filter Water Separator Cartridge",
                "Heavy Commercial Radial Bus Tyre 295/80 R22.5",
                "Alternator 28V 80A Heavy Commercial Bus",
              ].map((pName) => (
                <button
                  key={pName}
                  type="button"
                  onClick={() => {
                    const item = inventoryList.find((i) => i.part.toLowerCase() === pName.toLowerCase());
                    const price = item?.unitCost || 0;
                    const cat = item?.category || "";
                    // If first line is empty, replace it; otherwise append
                    setLines((prev) => {
                      if (prev.length === 1 && !prev[0].part.trim()) {
                        return [{ part: pName, category: cat, quantity: 1, unitPrice: price, totalCost: price }];
                      }
                      return [...prev, { part: pName, category: cat, quantity: 1, unitPrice: price, totalCost: price }];
                    });
                  }}
                  className="shrink-0 rounded-full border border-[--color-border] bg-[--color-surface-1] hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2.5 py-0.5 text-[11px] font-medium text-[--color-ink-700] hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  + {pName.split("(")[0].trim()}
                </button>
              ))}
            </div>

            <div ref={tableContainerRef} className="rounded-lg border border-[--color-border] overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-[--color-border] bg-[--color-surface-1] text-left text-xs uppercase tracking-wider text-[--color-ink-500]">
                    <th className="px-2.5 py-2.5 w-9 text-center">#</th>
                    <th className="px-3 py-2.5">Part / Item (Auto-suggest)</th>
                    <th className="px-3 py-2.5 w-48">Category (Separate Column)</th>
                    <th className="px-2.5 py-2.5 w-20 text-center">Qty</th>
                    <th className="px-3 py-2.5 w-28">Unit Price (₹)</th>
                    <th className="px-3 py-2.5 w-28">Line Total</th>
                    <th className="px-2 py-2.5 w-9 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--color-border]">
                  {lines.map((l, i) => {
                    const matchingParts = getMatchingParts(l.part);
                    const matchingCategories = getMatchingCategories(l.category || "");
                    return (
                      <tr key={i} className="hover:bg-[--color-surface-1]/50 transition-colors">
                        <td className="px-2.5 py-2.5 text-center text-xs font-mono text-[--color-ink-400]">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2.5 relative">
                          <input
                            type="text"
                            autoComplete="off"
                            value={l.part}
                            onChange={(e) => {
                              updateLinePart(i, e.target.value);
                              setActivePartDropdown(i);
                              setActiveCategoryDropdown(null);
                            }}
                            onFocus={() => {
                              setActivePartDropdown(i);
                              setActiveCategoryDropdown(null);
                            }}
                            placeholder="Type or select spare part…"
                            className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-xs font-medium text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                          />

                          {/* PART AUTOCOMPLETE POPUP */}
                          {activePartDropdown === i && (
                            <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[--color-border] bg-[--color-surface-0] shadow-2xl py-1 text-xs">
                              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[--color-ink-400] bg-[--color-surface-1] border-b border-[--color-border] flex items-center justify-between">
                                <span>Suggested Spares Catalog ({matchingParts.length})</span>
                                <span className="text-[10px] font-normal text-blue-600 dark:text-blue-400">
                                  Auto-fills name, category & price
                                </span>
                              </div>
                              {matchingParts.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-[--color-ink-400] italic">
                                  No matching standard parts. You can keep typing custom part name.
                                </div>
                              ) : (
                                matchingParts.map((item) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleSelectPart(i, item)}
                                    className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-b border-[--color-border] last:border-0 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-xs text-[--color-ink-900] group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                        {item.part}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[--color-ink-500]">
                                        <span className="rounded bg-[--color-surface-2] px-1.5 py-0.2 font-medium">
                                          {item.category}
                                        </span>
                                        <span>Stock: {item.currentStock} units</span>
                                      </div>
                                    </div>
                                    {item.unitCost ? (
                                      <div className="text-right shrink-0">
                                        <span className="text-xs font-semibold tabular text-[--color-ink-800]">
                                          ₹{item.unitCost.toLocaleString("en-IN")}
                                        </span>
                                        <span className="block text-[10px] text-[--color-ink-400]">Std Cost</span>
                                      </div>
                                    ) : null}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </td>

                        {/* SEPARATE CATEGORY COLUMN */}
                        <td className="px-3 py-2.5 relative">
                          <input
                            type="text"
                            autoComplete="off"
                            value={l.category || ""}
                            onChange={(e) => {
                              updateLineCategory(i, e.target.value);
                              setActiveCategoryDropdown(i);
                              setActivePartDropdown(null);
                            }}
                            onFocus={() => {
                              setActiveCategoryDropdown(i);
                              setActivePartDropdown(null);
                            }}
                            placeholder="Select/type category…"
                            className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-xs text-[--color-ink-900] focus:border-blue-500 focus:outline-none"
                          />

                          {/* CATEGORY AUTOCOMPLETE POPUP */}
                          {activeCategoryDropdown === i && (
                            <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-[--color-border] bg-[--color-surface-0] shadow-2xl py-1 text-xs">
                              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[--color-ink-400] bg-[--color-surface-1] border-b border-[--color-border] flex items-center justify-between">
                                <span>Suggested Categories</span>
                                <span className="text-[10px] font-normal text-blue-600 dark:text-blue-400">Click to choose</span>
                              </div>
                              {matchingCategories.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-[--color-ink-400] italic">
                                  Custom category. Press Tab or Enter to continue.
                                </div>
                              ) : (
                                matchingCategories.map((cat) => (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => handleSelectCategory(i, cat)}
                                    className={`w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-b border-[--color-border] last:border-0 transition-colors flex items-center justify-between text-xs cursor-pointer ${
                                      l.category === cat ? "font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20" : "text-[--color-ink-800]"
                                    }`}
                                  >
                                    <span>{cat}</span>
                                    {l.category === cat && <Check size={12} className="text-blue-600 dark:text-blue-400" />}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-2.5 py-2.5">
                          <input
                            type="number"
                            min="1"
                            value={l.quantity}
                            onChange={(e) => updateLineQty(i, Math.max(1, Number(e.target.value)))}
                            className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-2 py-1.5 text-xs text-center tabular font-semibold text-[--color-ink-900]"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            value={l.unitPrice}
                            onChange={(e) => updateLinePrice(i, Math.max(0, Number(e.target.value)))}
                            placeholder="0"
                            className="w-full rounded border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-xs tabular text-[--color-ink-900]"
                          />
                        </td>
                        <td className="px-3 py-2.5 tabular font-bold text-xs text-[--color-ink-900]">
                          ₹{l.totalCost.toLocaleString("en-IN")}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(i)}
                            title="Remove item"
                            className="text-[--color-ink-400] hover:text-red-500 cursor-pointer transition-colors p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {total === 0 && lines.length > 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Tip: Unit prices can be entered above or auto-populated from inventory, or left as 0 and finalized upon receiving stock and vendor invoice.
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
              <p className="text-xs text-[--color-ink-500]">Total PO Value</p>
              <p className="text-2xl font-bold tabular text-[--color-ink-900]">
                ₹{total.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate("/purchase-orders")}
                className="flex-1 sm:flex-none rounded-md border border-[--color-border] bg-[--color-surface-0] hover:bg-[--color-surface-1] px-4 py-2 text-xs font-medium text-[--color-ink-700] transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                id="submit-po-button-bottom"
                onClick={submit}
                disabled={submitting || lines.length === 0}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-md px-5 py-2 text-xs font-semibold text-white shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer ${
                  isCriticalBuy ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitting ? (
                  <span>Creating PO…</span>
                ) : (
                  <span>{isCriticalBuy ? "Create Emergency PO" : "Create Purchase Order"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPdf && (
        <PurchaseOrderPdfModal
          po={{
            poNumber: poNumber.trim() || `KSRTC/PO/DRAFT`,
            supplier: supplier.trim() || (isCriticalBuy ? "Emergency Procurement Vendor" : "KSRTC Central Stores"),
            supplierAddress: supplierAddress.trim() || undefined,
            depot: SINGLE_DEPOT_NAME,
            poDate: new Date().toISOString().slice(0, 10),
            expectedDelivery,
            total,
            status: "Draft",
            lines: lines.filter((l) => l.part.trim().length > 0),
            notes,
          }}
          onClose={() => setShowPdf(false)}
        />
      )}
    </div>
  );
}
