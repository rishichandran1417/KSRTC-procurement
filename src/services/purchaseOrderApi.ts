import { apiClient, ENDPOINTS, simulateLatency } from "./apiClient";
import { receiveItemStockIntoInventory } from "./inventoryApi";
import { SINGLE_DEPOT_NAME } from "../state/FiltersContext";
import type {
  PurchaseOrder,
  PoStatus,
  GoodsReceipt,
  GoodsReceiptItem,
  PoDeliveryReschedule,
  PoAuditLog,
} from "../types";

const LOCAL_CREATED_POS_KEY = "ksrtc_user_created_pos_v2";
const LOCAL_UPDATED_POS_KEY = "ksrtc_user_updated_pos_v2";
const LOCAL_GOODS_RECEIPTS_KEY = "ksrtc_goods_receipts_v1";
const LOCAL_DELIVERY_RESCHEDULES_KEY = "ksrtc_po_delivery_reschedules_v1";
const LOCAL_AUDIT_LOGS_KEY = "ksrtc_po_audit_logs_v1";

const DUMMY_PO_NUMBERS = ["PO-2026-1087", "PO-2026-0891", "PO-2026-0885", "PO-2026-0870"];

// Default Seed PO (including prompt's PO 08775 example)
const DEFAULT_SEED_POS: PurchaseOrder[] = [
  {
    id: "po-seed-08775",
    poNumber: "KSRTC/PO/2026/08775",
    supplier: "Ashok Leyland OEM Spares Division",
    supplierAddress: "Plot 42, Electronics & Heavy Auto Cluster, Kalamassery, Ernakulam, Kerala - 683104",
    depot: SINGLE_DEPOT_NAME,
    poDate: "2026-09-28",
    expectedDelivery: "2026-10-05",
    total: 185000,
    status: "Ordered",
    lines: [
      {
        part: "Brake Lining Set (Leyland Viking / Cheetah)",
        category: "Brake Systems",
        quantity: 100,
        unitPrice: 1850,
        totalCost: 185000,
        receivedQuantity: 0,
        rejectedQuantity: 0,
      },
    ],
    notes: "Critical supply order for depot maintenance stock replenishment.",
    deliverySchedule: [
      {
        id: "tranche-seed-08775-1",
        installmentNumber: 1,
        expectedDate: "2026-10-05",
        quantity: 50,
        receivedQuantity: 0,
        status: "Scheduled",
        notes: "1st Tranche - Immediate delivery (50 units)",
      },
      {
        id: "tranche-seed-08775-2",
        installmentNumber: 2,
        expectedDate: "2026-10-15",
        quantity: 25,
        receivedQuantity: 0,
        status: "Scheduled",
        notes: "2nd Tranche - Mid-month delivery (25 units)",
      },
      {
        id: "tranche-seed-08775-3",
        installmentNumber: 3,
        expectedDate: "2026-10-25",
        quantity: 25,
        receivedQuantity: 0,
        status: "Scheduled",
        notes: "3rd Tranche - End-month delivery (25 units)",
      },
    ],
  },
  {
    id: "po-seed-03281",
    poNumber: "KSRTC/PO/2026/03281",
    supplier: "Sundaram Clutches & Spares",
    supplierAddress: "Industrial Estate, West Fort, Thrissur, Kerala - 680004",
    depot: SINGLE_DEPOT_NAME,
    poDate: "2026-09-30",
    expectedDelivery: "2026-10-12",
    total: 135000,
    status: "Ordered",
    lines: [
      {
        part: "Clutch Plate Assembly 380mm (Organic)",
        category: "Transmission & Powertrain",
        quantity: 25,
        unitPrice: 5400,
        totalCost: 135000,
        receivedQuantity: 0,
        rejectedQuantity: 0,
      },
    ],
    notes: "Heavy commercial 6-speed bus transmission clutch plates.",
  },
];

// ---------------------------------------------------------------------------
// LOCAL STORAGE HELPERS
// ---------------------------------------------------------------------------

// In-memory caches to prevent expensive repeated localStorage parsing
let cachedCreatedOrders: PurchaseOrder[] | null = null;
let cachedUpdatedOrders: Record<string, PurchaseOrder> | null = null;
let cachedGoodsReceipts: GoodsReceipt[] | null = null;
let cachedDeliveryReschedules: PoDeliveryReschedule[] | null = null;
let cachedAuditLogs: PoAuditLog[] | null = null;

export function loadCreatedOrders(): PurchaseOrder[] {
  if (cachedCreatedOrders) return cachedCreatedOrders;
  try {
    const raw = localStorage.getItem(LOCAL_CREATED_POS_KEY);
    if (!raw) {
      cachedCreatedOrders = [];
      return [];
    }
    const parsed: PurchaseOrder[] = JSON.parse(raw);
    cachedCreatedOrders = parsed.map((p) => {
      let num = p.poNumber || "";
      if (num.startsWith("PO-")) {
        const digits = num.replace(/\D/g, "");
        num = `KSRTC/PO/2026/${digits.padStart(5, "0")}`;
      }
      return { ...p, poNumber: num };
    });
    return cachedCreatedOrders;
  } catch {
    cachedCreatedOrders = [];
    return [];
  }
}

export function saveCreatedOrders(orders: PurchaseOrder[]): void {
  cachedCreatedOrders = orders;
  try {
    localStorage.setItem(LOCAL_CREATED_POS_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error("Failed to save created orders to localStorage:", err);
  }
}

export function loadUpdatedOrders(): Record<string, PurchaseOrder> {
  if (cachedUpdatedOrders) return cachedUpdatedOrders;
  try {
    const raw = localStorage.getItem(LOCAL_UPDATED_POS_KEY);
    if (!raw) {
      cachedUpdatedOrders = {};
      return {};
    }
    cachedUpdatedOrders = JSON.parse(raw) || {};
    return cachedUpdatedOrders || {};
  } catch {
    cachedUpdatedOrders = {};
    return {};
  }
}

export function saveUpdatedOrders(updates: Record<string, PurchaseOrder>): void {
  cachedUpdatedOrders = updates;
  try {
    localStorage.setItem(LOCAL_UPDATED_POS_KEY, JSON.stringify(updates));
  } catch (err) {
    console.error("Failed to save updated orders to localStorage:", err);
  }
}

// Goods Receipts Storage
export function loadGoodsReceipts(): GoodsReceipt[] {
  if (cachedGoodsReceipts) return cachedGoodsReceipts;
  try {
    const raw = localStorage.getItem(LOCAL_GOODS_RECEIPTS_KEY);
    if (!raw) {
      cachedGoodsReceipts = [];
      return [];
    }
    cachedGoodsReceipts = JSON.parse(raw) || [];
    return cachedGoodsReceipts || [];
  } catch {
    cachedGoodsReceipts = [];
    return [];
  }
}

export function saveGoodsReceipts(receipts: GoodsReceipt[]): void {
  cachedGoodsReceipts = receipts;
  try {
    localStorage.setItem(LOCAL_GOODS_RECEIPTS_KEY, JSON.stringify(receipts));
  } catch (err) {
    console.error("Failed to save goods receipts:", err);
  }
}

export function getGoodsReceipts(poNumber?: string): GoodsReceipt[] {
  const all = loadGoodsReceipts();
  if (!poNumber) return all;
  return all.filter((r) => r.poNumber === poNumber);
}

// Delivery Reschedules Storage
export function loadDeliveryReschedules(): PoDeliveryReschedule[] {
  if (cachedDeliveryReschedules) return cachedDeliveryReschedules;
  try {
    const raw = localStorage.getItem(LOCAL_DELIVERY_RESCHEDULES_KEY);
    if (!raw) {
      cachedDeliveryReschedules = [];
      return [];
    }
    cachedDeliveryReschedules = JSON.parse(raw) || [];
    return cachedDeliveryReschedules || [];
  } catch {
    cachedDeliveryReschedules = [];
    return [];
  }
}

export function saveDeliveryReschedules(items: PoDeliveryReschedule[]): void {
  cachedDeliveryReschedules = items;
  try {
    localStorage.setItem(LOCAL_DELIVERY_RESCHEDULES_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save delivery reschedules:", err);
  }
}

export function getDeliveryReschedules(poNumber?: string): PoDeliveryReschedule[] {
  const all = loadDeliveryReschedules();
  if (!poNumber) return all;
  return all.filter((r) => r.poNumber === poNumber);
}

// Audit Logs Storage
export function loadAuditLogs(): PoAuditLog[] {
  if (cachedAuditLogs) return cachedAuditLogs;
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
    if (!raw) {
      cachedAuditLogs = [];
      return [];
    }
    cachedAuditLogs = JSON.parse(raw) || [];
    return cachedAuditLogs || [];
  } catch {
    cachedAuditLogs = [];
    return [];
  }
}

export function saveAuditLogs(logs: PoAuditLog[]): void {
  cachedAuditLogs = logs;
  try {
    localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error("Failed to save audit logs:", err);
  }
}

const STAGE_RANK: Record<string, number> = {
  "PO Created": 1,
  "PO Edited": 2,
  "Delivery Date Changed": 3,
  "PO Submitted/Ordered": 4,
  "Goods Receipt Created": 5,
  "Partial Receipt": 6,
  "Rejected Quantity Recorded": 7,
  "Full Receipt": 8,
  "PO Status Updated": 9,
  "PO Cancelled": 10,
  "PO Closed": 11,
};

export function sortAuditLogs(logs: PoAuditLog[]): PoAuditLog[] {
  return [...logs].sort((a, b) => {
    const timeA = a.timestamp || "";
    const timeB = b.timestamp || "";
    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }
    const rankA = STAGE_RANK[a.action] || 99;
    const rankB = STAGE_RANK[b.action] || 99;
    return rankA - rankB;
  });
}

export function ensureAuditLogsForPo(po: PurchaseOrder): PoAuditLog[] {
  let allLogs = loadAuditLogs();
  const poLogs = allLogs.filter((l) => l.poNumber === po.poNumber);
  const existingActions = new Set(poLogs.map((l) => l.action));

  const totalOrdered = po.lines?.reduce((s, l) => s + (Number(l.quantity) || 0), 0) || 0;
  const totalReceived = po.lines?.reduce((s, l) => s + (Number(l.receivedQuantity) || 0), 0) || 0;
  const totalRejected = po.lines?.reduce((s, l) => s + (Number(l.rejectedQuantity) || 0), 0) || 0;
  const hasRejections = po.hasRejections || totalRejected > 0;

  const baseDate = po.poDate || "2026-09-28";

  const newLogsToAdd: PoAuditLog[] = [];

  // 1. PO Created
  if (!existingActions.has("PO Created")) {
    newLogsToAdd.push({
      id: `audit-created-${po.poNumber}`,
      poNumber: po.poNumber,
      action: "PO Created",
      performedBy: "KSRTC Procurement Officer",
      timestamp: `${baseDate} 09:30`,
      newValue: `PO Created with ${po.lines?.length || 0} line items. Total value ₹${po.total.toLocaleString("en-IN")}`,
      remarks: po.notes || "Purchase order initialized.",
    });
  }

  // 2. PO Submitted/Ordered
  if (po.status !== "Draft" && !existingActions.has("PO Submitted/Ordered")) {
    newLogsToAdd.push({
      id: `audit-ordered-${po.poNumber}`,
      poNumber: po.poNumber,
      action: "PO Submitted/Ordered",
      performedBy: "KSRTC Procurement Officer",
      timestamp: `${baseDate} 10:15`,
      newValue: `PO submitted and issued to supplier ${po.supplier}`,
      remarks: `Expected delivery date: ${po.expectedDelivery || "2026-10-05"}`,
    });
  }

  // 3. Receipt & Rejections
  const isReceived = po.status === "Received";
  const isPartiallyReceived = po.status === "Partially Received";

  if (isReceived || isPartiallyReceived || totalReceived > 0 || totalRejected > 0) {
    if (!existingActions.has("Goods Receipt Created")) {
      const rawNum = po.poNumber.split("/").pop() || "00000";
      const acceptedCount = totalReceived > 0 ? totalReceived : (isReceived ? totalOrdered - totalRejected : totalOrdered);
      const rejectedCount = totalRejected;
      newLogsToAdd.push({
        id: `audit-grn-${po.poNumber}`,
        poNumber: po.poNumber,
        action: "Goods Receipt Created",
        performedBy: "KSRTC Receiving Officer",
        timestamp: `${baseDate} 11:00`,
        newValue: `Goods Receipt GRN/2026/${rawNum}/01 processed (${acceptedCount} accepted into inventory, ${rejectedCount} rejected)`,
        remarks: "Shipment received and inspected at KSRTC central depot.",
      });
    }

    if (hasRejections && !existingActions.has("Rejected Quantity Recorded")) {
      const rejUnits = totalRejected > 0 ? totalRejected : 10;
      const lineRejections = po.lines
        ?.filter((l) => (l.rejectedQuantity || 0) > 0)
        .map((l) => `${l.part}: ${l.rejectedQuantity} units (Damaged)`)
        .join("; ");

      newLogsToAdd.push({
        id: `audit-rejected-${po.poNumber}`,
        poNumber: po.poNumber,
        action: "Rejected Quantity Recorded",
        performedBy: "Quality Inspector",
        timestamp: `${baseDate} 11:05`,
        newValue: `${rejUnits} rejected units recorded separately`,
        reason: lineRejections || "Damaged / Substandard Quality",
        remarks: "Rejected quantities are stored separately for quality audit and NOT added to central inventory stock.",
      });
    }

    if (isReceived && !existingActions.has("Full Receipt")) {
      newLogsToAdd.push({
        id: `audit-full-${po.poNumber}`,
        poNumber: po.poNumber,
        action: "Full Receipt",
        performedBy: "KSRTC Receiving Officer",
        timestamp: `${baseDate} 11:10`,
        previousValue: `Pending: ${totalOrdered}`,
        newValue: "All ordered items fully accounted for (Pending: 0)",
        remarks: hasRejections ? `Fulfilled with ${totalRejected} rejected discrepancy units.` : "Order fully received and central inventory updated.",
      });
    } else if (isPartiallyReceived && !existingActions.has("Partial Receipt")) {
      const pendingCount = Math.max(0, totalOrdered - totalReceived - totalRejected);
      newLogsToAdd.push({
        id: `audit-partial-${po.poNumber}`,
        poNumber: po.poNumber,
        action: "Partial Receipt",
        performedBy: "KSRTC Receiving Officer",
        timestamp: `${baseDate} 11:10`,
        newValue: `Received in shipment: ${totalReceived} units (Total Received: ${totalReceived}, Pending: ${pendingCount} units)`,
        remarks: `Partial delivery received at depot. Remaining pending quantity: ${pendingCount} units.`,
      });
    }

    if (isReceived && !existingActions.has("PO Status Updated") && !existingActions.has("PO Received")) {
      newLogsToAdd.push({
        id: `audit-status-received-${po.poNumber}`,
        poNumber: po.poNumber,
        action: "PO Status Updated",
        performedBy: "KSRTC Procurement Officer",
        timestamp: `${baseDate} 11:15`,
        previousValue: "Status: Ordered",
        newValue: "Status: Received",
        remarks: "PO status set to Received upon verified receipt.",
      });
    } else if (isPartiallyReceived && !existingActions.has("PO Status Updated")) {
      newLogsToAdd.push({
        id: `audit-status-partial-${po.poNumber}`,
        poNumber: po.poNumber,
        action: "PO Status Updated",
        performedBy: "KSRTC Procurement Officer",
        timestamp: `${baseDate} 11:15`,
        previousValue: "Status: Ordered",
        newValue: "Status: Partially Received",
        remarks: "PO status set to Partially Received.",
      });
    }
  }

  if (po.status === "Cancelled" && !existingActions.has("PO Cancelled")) {
    newLogsToAdd.push({
      id: `audit-cancelled-${po.poNumber}`,
      poNumber: po.poNumber,
      action: "PO Cancelled",
      performedBy: "KSRTC Procurement Officer",
      timestamp: `${baseDate} 12:00`,
      previousValue: "Status: Ordered",
      newValue: "Status: Cancelled",
      remarks: "Purchase order cancelled by procurement officer.",
    });
  }

  if (po.status === "Closed" && !existingActions.has("PO Closed")) {
    newLogsToAdd.push({
      id: `audit-closed-${po.poNumber}`,
      poNumber: po.poNumber,
      action: "PO Closed",
      performedBy: "KSRTC Procurement Officer",
      timestamp: `${baseDate} 12:00`,
      previousValue: "Status: Received",
      newValue: "Status: Closed",
      remarks: "Purchase order closed following audit verification.",
    });
  }

  if (newLogsToAdd.length > 0) {
    allLogs = [...allLogs, ...newLogsToAdd];
    saveAuditLogs(allLogs);
  }

  const result = allLogs.filter((l) => l.poNumber === po.poNumber);
  return sortAuditLogs(result);
}

export function getAuditLogs(poNumber?: string): PoAuditLog[] {
  let allLogs = loadAuditLogs();

  if (poNumber) {
    const po = activeOrders.find((p) => p.poNumber === poNumber);
    if (po) {
      return ensureAuditLogsForPo(po);
    }
    const filtered = allLogs.filter((l) => l.poNumber === poNumber);
    return sortAuditLogs(filtered);
  }

  return sortAuditLogs(allLogs);
}

export function createAuditLog(entry: Omit<PoAuditLog, "id" | "timestamp">): PoAuditLog {
  const now = new Date();
  const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;
  const newLog: PoAuditLog = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp,
    performedBy: entry.performedBy || "KSRTC Procurement Officer",
  };
  const logs = loadAuditLogs();
  saveAuditLogs([newLog, ...logs]);
  return newLog;
}

// Active state cache
let activeOrders: PurchaseOrder[] = [];

// ---------------------------------------------------------------------------
// PO NUMBER GENERATION
// ---------------------------------------------------------------------------

export function getNextPoNumber(orders: PurchaseOrder[] = activeOrders): string {
  const currentYear = new Date().getFullYear();
  let maxSeq = 8775;

  const checkList = orders.length > 0 ? orders : loadCreatedOrders();
  for (const o of checkList) {
    if (!o.poNumber) continue;
    const match = o.poNumber.match(/(\d{4,6})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= maxSeq && num < 99999) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(5, "0");
  return `KSRTC/PO/${currentYear}/${nextSeq}`;
}

// ---------------------------------------------------------------------------
// CORE PO GET & MUTATION API
// ---------------------------------------------------------------------------

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const createdOrders = loadCreatedOrders();
  const updatedOrders = loadUpdatedOrders();

  let finalOrders: PurchaseOrder[] = [];
  const seenNumbers = new Set<string>();

  // Helper to append orders without duplicates
  const addOrders = (list: PurchaseOrder[]) => {
    for (const item of list) {
      if (!item.poNumber || DUMMY_PO_NUMBERS.includes(item.poNumber)) continue;
      if (!seenNumbers.has(item.poNumber)) {
        // Apply any local updates
        const updated = updatedOrders[item.poNumber]
          ? { ...item, ...updatedOrders[item.poNumber] }
          : item;
        finalOrders.push(updated);
        seenNumbers.add(item.poNumber);
      }
    }
  };

  // 1. User created orders first
  addOrders(createdOrders);

  // 2. Fetch remote orders if available
  if (ENDPOINTS.base) {
    try {
      const remote = await apiClient.get<any[]>(`${ENDPOINTS.base}/purchase-orders`);
      if (Array.isArray(remote)) {
        const normalizedRemote: PurchaseOrder[] = remote.map((r) => {
          const poNumber = r.poNumber || r.po_number || `PO-${r.id}`;
          return {
            id: r.id || r.po_id,
            poNumber,
            supplier: r.supplier || r.supplier_name || "KSRTC Central Stores",
            supplierAddress: r.supplierAddress || r.supplier_address || r.address || "",
            depot: r.depot || SINGLE_DEPOT_NAME,
            poDate: r.poDate || (r.order_date ? r.order_date.slice(0, 10) : new Date().toISOString().slice(0, 10)),
            expectedDelivery:
              r.expectedDelivery || (r.expected_date ? r.expected_date.slice(0, 10) : new Date().toISOString().slice(0, 10)),
            total: r.total ?? r.total_value ?? 0,
            status: r.status || "Submitted",
            lines:
              r.lines ||
              (r.items
                ? r.items.map((it: any) => ({
                    part: it.part || it.part_name || `Part #${it.part_id}`,
                    quantity: it.quantity || it.ordered_quantity || 1,
                    unitPrice: it.unitPrice || it.unit_cost || it.unit_price || 0,
                    totalCost:
                      it.total_cost ||
                      it.line_total ||
                      (it.quantity || it.ordered_quantity || 1) *
                        (it.unitPrice || it.unit_cost || it.unit_price || 0),
                    receivedQuantity: it.received_quantity || 0,
                    rejectedQuantity: it.rejected_quantity || 0,
                  }))
                : []),
            notes: r.notes || "",
          };
        });
        addOrders(normalizedRemote);
      }
    } catch (err: any) {
      console.debug("API call to /purchase-orders deferred:", err?.message || err);
    }
  }

  // 3. Active cached orders
  addOrders(activeOrders);

  // 4. Default Seed POs (guarantees PO 08775 exists for testing)
  addOrders(DEFAULT_SEED_POS);

  // Ensure complete PO Audit Logs & sync delivery reschedules info for all orders
  for (const po of finalOrders) {
    const reschedules = getDeliveryReschedules(po.poNumber);
    if (reschedules.length > 0) {
      po.expectedDelivery = reschedules[0].newDate;
      po.isRescheduled = true;
      po.rescheduleCount = reschedules.length;
    }
    ensureAuditLogsForPo(po);
  }

  activeOrders = finalOrders;
  return simulateLatency(finalOrders, 10);
}

export async function createPurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrder> {
  const newPo: PurchaseOrder = {
    ...po,
    isNew: true,
    createdAt: po.createdAt || Date.now(),
    lines: (po.lines || []).map((l) => ({
      ...l,
      receivedQuantity: l.receivedQuantity || 0,
      rejectedQuantity: l.rejectedQuantity || 0,
    })),
  };

  const createdOrders = loadCreatedOrders();
  const updatedCreated = [newPo, ...createdOrders.filter((p) => p.poNumber !== newPo.poNumber)];
  saveCreatedOrders(updatedCreated);

  activeOrders = [newPo, ...activeOrders.filter((p) => p.poNumber !== newPo.poNumber)];

  // Automatic Audit Trail Entry
  createAuditLog({
    poNumber: newPo.poNumber,
    action: "PO Created",
    performedBy: "KSRTC Procurement Officer",
    newValue: `Supplier: ${newPo.supplier}, Total: ₹${newPo.total.toLocaleString("en-IN")}`,
    remarks: newPo.notes || "PO Created manually.",
  });

  if (newPo.status === "Ordered" || newPo.status === "Submitted") {
    createAuditLog({
      poNumber: newPo.poNumber,
      action: "PO Submitted/Ordered",
      performedBy: "KSRTC Procurement Officer",
      newValue: `Status: ${newPo.status}`,
      remarks: `Expected Delivery: ${newPo.expectedDelivery}`,
    });
  }

  // Attempt backend persistence
  if (ENDPOINTS.base) {
    (async () => {
      try {
        const payload = {
          po_number: newPo.poNumber,
          supplier: newPo.supplier,
          vendor: newPo.supplier,
          order_date: newPo.poDate ? `${newPo.poDate}T00:00:00` : new Date().toISOString(),
          expected_delivery_date: newPo.expectedDelivery ? `${newPo.expectedDelivery}T00:00:00` : new Date().toISOString(),
          currency: "INR",
          created_by: "Procurement Officer",
          items: (newPo.lines || []).map((l, idx) => ({
            part_id: idx + 1,
            ordered_quantity: l.quantity,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            unit_cost: l.unitPrice,
            line_total: l.totalCost,
          })),
        };
        await apiClient.post<any>(`${ENDPOINTS.base}/purchase-orders`, payload);
      } catch (err: any) {
        console.debug("Backend PO creation sync deferred:", err?.message || err);
      }
    })();
  }

  return simulateLatency(newPo, 10);
}

export async function updatePurchaseOrder(updated: PurchaseOrder): Promise<PurchaseOrder> {
  const allOrders = activeOrders.length > 0 ? activeOrders : await getPurchaseOrders();
  const existing = allOrders.find((p) => p.poNumber === updated.poNumber);

  // Recalculate totals and check line quantities
  let totalOrdered = 0;
  let totalReceived = 0;
  let totalRejected = 0;

  if (updated.lines && updated.lines.length > 0) {
    for (const line of updated.lines) {
      totalOrdered += Number(line.quantity) || 0;
      totalReceived += Number(line.receivedQuantity) || 0;
      totalRejected += Number(line.rejectedQuantity) || 0;
    }

    const totalProcessed = totalReceived + totalRejected;
    if (totalProcessed >= totalOrdered && totalOrdered > 0) {
      updated.status = "Received";
      updated.inventoryReceived = true;
    } else if (totalProcessed > 0) {
      updated.status = "Partially Received";
      updated.inventoryReceived = false;
    }

    if (totalRejected > 0) {
      updated.hasRejections = true;
      updated.totalRejectedUnits = totalRejected;
    }
  }

  const createdOrders = loadCreatedOrders();
  const isCreated = createdOrders.some((p) => p.poNumber === updated.poNumber);

  if (isCreated) {
    const nextCreated = createdOrders.map((p) => (p.poNumber === updated.poNumber ? updated : p));
    saveCreatedOrders(nextCreated);
  } else {
    const updatedMap = loadUpdatedOrders();
    updatedMap[updated.poNumber] = updated;
    saveUpdatedOrders(updatedMap);
  }

  activeOrders = activeOrders.map((p) => (p.poNumber === updated.poNumber ? updated : p));

  // Automatic Audit Trail Entry for Edit / Status Change
  if (existing) {
    if (existing.status !== updated.status) {
      createAuditLog({
        poNumber: updated.poNumber,
        action: updated.status === "Cancelled" ? "PO Cancelled" : updated.status === "Closed" ? "PO Closed" : "PO Edited",
        performedBy: "KSRTC Procurement Officer",
        previousValue: `Status: ${existing.status}`,
        newValue: `Status: ${updated.status}`,
        remarks: `PO status modified to ${updated.status}`,
      });
    } else {
      createAuditLog({
        poNumber: updated.poNumber,
        action: "PO Edited",
        performedBy: "KSRTC Procurement Officer",
        newValue: `Updated details (Total ₹${updated.total.toLocaleString("en-IN")})`,
        remarks: updated.notes || "PO details updated.",
      });
    }
  }

  return simulateLatency(updated, 10);
}

export const VALID_STATUS_TRANSITIONS: Record<PoStatus, PoStatus[]> = {
  Draft: ["Submitted", "Cancelled"],
  Submitted: ["Approved", "Cancelled"],
  Approved: ["Ordered", "Cancelled"],
  Ordered: ["Partially Received", "Received", "Cancelled"],
  "Partially Received": ["Received"],
  Received: ["Closed"],
  Closed: [],
  Cancelled: [],
  Delayed: [],
};

export function canTransitionPoStatus(from: PoStatus, to: PoStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function isPoDelayed(po: PurchaseOrder): boolean {
  if (["Received", "Closed", "Cancelled"].includes(po.status)) return false;
  const totalOrdered = po.lines?.reduce((s, l) => s + (Number(l.quantity) || 0), 0) || 0;
  const totalReceived = po.lines?.reduce((s, l) => s + (Number(l.receivedQuantity) || 0), 0) || 0;
  const totalRejected = po.lines?.reduce((s, l) => s + (Number(l.rejectedQuantity) || 0), 0) || 0;
  const pending = Math.max(0, totalOrdered - totalReceived - totalRejected);

  if (pending <= 0) return false;
  if (!po.expectedDelivery) return false;

  const deliveryDate = new Date(po.expectedDelivery).getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  return today > deliveryDate;
}

export function getDelayDays(po: PurchaseOrder): number {
  if (!isPoDelayed(po)) return 0;
  const deliveryDate = new Date(po.expectedDelivery).getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  return Math.ceil((today - deliveryDate) / (1000 * 60 * 60 * 24));
}

export async function submitPurchaseOrder(poNumber: string): Promise<PurchaseOrder> {
  const allOrders = activeOrders.length > 0 ? activeOrders : await getPurchaseOrders();
  const existing = allOrders.find((p) => p.poNumber === poNumber);
  if (!existing) throw new Error(`PO ${poNumber} not found.`);
  if (!canTransitionPoStatus(existing.status, "Submitted")) {
    throw new Error(`Cannot submit PO in ${existing.status} status.`);
  }

  const updated: PurchaseOrder = { ...existing, status: "Submitted" };
  await updatePurchaseOrder(updated);

  createAuditLog({
    poNumber,
    action: "PO Submitted",
    performedBy: "KSRTC Procurement Officer",
    previousValue: `Status: ${existing.status}`,
    newValue: "Status: Submitted",
    remarks: "PO finalized and submitted for authorization.",
  });

  return updated;
}

export async function approvePurchaseOrder(poNumber: string): Promise<PurchaseOrder> {
  const allOrders = activeOrders.length > 0 ? activeOrders : await getPurchaseOrders();
  const existing = allOrders.find((p) => p.poNumber === poNumber);
  if (!existing) throw new Error(`PO ${poNumber} not found.`);
  if (!canTransitionPoStatus(existing.status, "Approved")) {
    throw new Error(`Cannot approve PO in ${existing.status} status.`);
  }

  const updated: PurchaseOrder = { ...existing, status: "Approved" };
  await updatePurchaseOrder(updated);

  createAuditLog({
    poNumber,
    action: "PO Approved",
    performedBy: "KSRTC Procurement Officer",
    previousValue: `Status: ${existing.status}`,
    newValue: "Status: Approved",
    remarks: "PO authorized and approved by officer.",
  });

  return updated;
}

export async function orderPurchaseOrder(poNumber: string): Promise<PurchaseOrder> {
  const allOrders = activeOrders.length > 0 ? activeOrders : await getPurchaseOrders();
  const existing = allOrders.find((p) => p.poNumber === poNumber);
  if (!existing) throw new Error(`PO ${poNumber} not found.`);
  if (!canTransitionPoStatus(existing.status, "Ordered")) {
    throw new Error(`Cannot place order for PO in ${existing.status} status.`);
  }

  const updated: PurchaseOrder = { ...existing, status: "Ordered" };
  await updatePurchaseOrder(updated);

  createAuditLog({
    poNumber,
    action: "PO Ordered",
    performedBy: "KSRTC Procurement Officer",
    previousValue: `Status: ${existing.status}`,
    newValue: "Status: Ordered",
    remarks: `Order placed with supplier ${existing.supplier}. Expected delivery date: ${existing.expectedDelivery}`,
  });

  return updated;
}

export async function cancelPurchaseOrder(poNumber: string, reason?: string): Promise<PurchaseOrder> {
  const allOrders = activeOrders.length > 0 ? activeOrders : await getPurchaseOrders();
  const existing = allOrders.find((p) => p.poNumber === poNumber);
  if (!existing) throw new Error(`PO ${poNumber} not found.`);

  const reasonStr = (reason || "").trim() || "Order cancelled by officer.";
  if (!canTransitionPoStatus(existing.status, "Cancelled")) {
    throw new Error(`Cannot cancel purchase order in ${existing.status} status.`);
  }

  const noteAddition = `\n[CANCELLED: ${reasonStr}]`;
  const updated: PurchaseOrder = {
    ...existing,
    status: "Cancelled",
    notes: ((existing.notes || "") + noteAddition).trim(),
  };
  await updatePurchaseOrder(updated);

  createAuditLog({
    poNumber,
    action: "PO Cancelled",
    performedBy: "KSRTC Procurement Officer",
    previousValue: `Status: ${existing.status}`,
    newValue: "Status: Cancelled",
    reason: reasonStr,
    remarks: `PO cancelled. Reason: ${reasonStr}`,
  });

  return updated;
}

export async function closePurchaseOrder(poNumber: string): Promise<PurchaseOrder> {
  const allOrders = activeOrders.length > 0 ? activeOrders : await getPurchaseOrders();
  const existing = allOrders.find((p) => p.poNumber === poNumber);
  if (!existing) throw new Error(`PO ${poNumber} not found.`);
  if (existing.status !== "Received") {
    throw new Error(`Only Received purchase orders can be closed.`);
  }

  const updated: PurchaseOrder = { ...existing, status: "Closed" };
  await updatePurchaseOrder(updated);

  createAuditLog({
    poNumber,
    action: "PO Closed",
    performedBy: "KSRTC Procurement Officer",
    previousValue: "Status: Received",
    newValue: "Status: Closed",
    remarks: "PO lifecycle closed following audit and stock verification.",
  });

  return updated;
}

export async function updatePoStatus(poNumber: string, status: PoStatus): Promise<PurchaseOrder> {
  if (status === "Submitted") return submitPurchaseOrder(poNumber);
  if (status === "Approved") return approvePurchaseOrder(poNumber);
  if (status === "Ordered") return orderPurchaseOrder(poNumber);
  if (status === "Closed") return closePurchaseOrder(poNumber);
  if (status === "Cancelled") return cancelPurchaseOrder(poNumber, "Cancelled via status action");

  const allOrders = activeOrders.length > 0 ? activeOrders : await getPurchaseOrders();
  const existing = allOrders.find((p) => p.poNumber === poNumber);
  const updatedPo: PurchaseOrder = existing ? { ...existing, status } : { poNumber, supplier: "KSRTC", depot: SINGLE_DEPOT_NAME, poDate: "", expectedDelivery: "", total: 0, status, lines: [] };
  await updatePurchaseOrder(updatedPo);
  return updatedPo;
}

// ---------------------------------------------------------------------------
// 1. REJECTED / DAMAGED QUANTITY & GOODS RECEIPT TRANSACTION-SAFE API
// ---------------------------------------------------------------------------

export interface ProcessGoodsReceiptPayload {
  poNumber: string;
  items: GoodsReceiptItem[];
  globalRemarks?: string;
  receivedBy?: string;
}

export async function processGoodsReceipt(
  payload: ProcessGoodsReceiptPayload
): Promise<{ receipt: GoodsReceipt; updatedPo: PurchaseOrder }> {
  const { poNumber, items, globalRemarks, receivedBy = "KSRTC Procurement Officer" } = payload;
  const allOrders = activeOrders.length > 0 ? activeOrders : await getPurchaseOrders();
  const existingPo = allOrders.find((p) => p.poNumber === poNumber);

  if (!existingPo) {
    throw new Error(`Purchase order ${poNumber} not found.`);
  }

  if (["Closed", "Cancelled"].includes(existingPo.status)) {
    throw new Error(`Cannot process receipt for ${existingPo.status} purchase order.`);
  }

  // Validate item quantities and rejections
  for (const item of items) {
    const accepted = Number(item.acceptedQuantity) || 0;
    const rejected = Number(item.rejectedQuantity) || 0;
    const pending = Number(item.pendingQuantity) || 0;

    if (accepted < 0 || rejected < 0) {
      throw new Error(`Negative quantities are not allowed for ${item.part}.`);
    }

    if (accepted + rejected > pending) {
      throw new Error(
        `Total processed (${accepted + rejected}) exceeds remaining pending quantity (${pending}) for ${item.part}.`
      );
    }

    if (rejected > 0 && !item.rejectionReason) {
      item.rejectionReason = "Damaged";
    }
  }

  // --------------------------------------------------
  // TRANSACTION-SAFE EXECUTION:
  // 1. Create Goods Receipt entity
  // 2. Update Inventory Stock ONLY for accepted quantities
  // 3. Update PO line quantities & PO status
  // 4. Record Audit Log events
  // --------------------------------------------------

  const existingReceipts = getGoodsReceipts(poNumber);
  const receiptIndex = existingReceipts.length + 1;
  const rawNum = poNumber.split("/").pop() || "00000";
  const receiptNumber = `GRN/${new Date().getFullYear()}/${rawNum}/${String(receiptIndex).padStart(2, "0")}`;

  const todayStr = new Date().toISOString().slice(0, 10);
  const newReceipt: GoodsReceipt = {
    id: `grn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    receiptNumber,
    poNumber,
    receiptDate: todayStr,
    receivedBy,
    remarks: globalRemarks || "",
    items: items.map((it) => ({
      part: it.part,
      category: it.category,
      orderedQuantity: Number(it.orderedQuantity) || 0,
      previouslyReceived: Number(it.previouslyReceived) || 0,
      pendingQuantity: Number(it.pendingQuantity) || 0,
      acceptedQuantity: Number(it.acceptedQuantity) || 0,
      rejectedQuantity: Number(it.rejectedQuantity) || 0,
      rejectionReason: it.rejectionReason || (Number(it.rejectedQuantity) > 0 ? "Damaged" : undefined),
      customRejectionReason: it.customRejectionReason,
      remarks: it.remarks || "",
    })),
    createdAt: new Date().toISOString(),
  };

  // Step 2: Update Inventory stock for accepted quantities ONLY
  let totalAcceptedThisReceipt = 0;
  let totalRejectedThisReceipt = 0;

  for (const item of newReceipt.items) {
    totalAcceptedThisReceipt += item.acceptedQuantity;
    totalRejectedThisReceipt += item.rejectedQuantity;

    if (item.acceptedQuantity > 0) {
      // ONLY ACCEPTED QUANTITY UPDATES INVENTORY STOCK! REJECTED IS NEVER ADDED TO STOCK.
      await receiveItemStockIntoInventory(item.part, item.acceptedQuantity, item.category);
    }
  }

  // Step 3: Update PO line items
  const updatedLines = (existingPo.lines || []).map((line) => {
    const match = newReceipt.items.find((it) => it.part.toLowerCase().trim() === line.part.toLowerCase().trim());
    if (match) {
      const newRec = (Number(line.receivedQuantity) || 0) + match.acceptedQuantity;
      const newRej = (Number(line.rejectedQuantity) || 0) + match.rejectedQuantity;
      return {
        ...line,
        receivedQuantity: newRec,
        rejectedQuantity: newRej,
      };
    }
    return line;
  });

  // Calculate PO pending & rejected totals across all lines
  let totalOrderedAll = 0;
  let totalReceivedAll = 0;
  let totalRejectedAll = 0;

  for (const line of updatedLines) {
    totalOrderedAll += Number(line.quantity) || 0;
    totalReceivedAll += Number(line.receivedQuantity) || 0;
    totalRejectedAll += Number(line.rejectedQuantity) || 0;
  }

  const remainingPendingAll = Math.max(0, totalOrderedAll - totalReceivedAll - totalRejectedAll);

  // If there is ANY product rejected (from 1 to anything) OR pending remains -> Partially Received!
  let newStatus: PoStatus = existingPo.status;
  if (remainingPendingAll > 0 || totalRejectedAll > 0) {
    newStatus = "Partially Received";
  } else if (remainingPendingAll === 0 && totalRejectedAll === 0) {
    newStatus = "Received";
  }

  const updatedPo: PurchaseOrder = {
    ...existingPo,
    lines: updatedLines,
    status: newStatus,
    inventoryReceived: remainingPendingAll === 0,
    hasRejections: totalRejectedAll > 0,
    totalRejectedUnits: totalRejectedAll,
  };

  // Save Goods Receipt to storage
  const allReceipts = loadGoodsReceipts();
  saveGoodsReceipts([newReceipt, ...allReceipts]);

  // Save updated PO to storage
  await updatePurchaseOrder(updatedPo);

  // Step 4: Record Automatic Audit Log Entries
  const isFullReceipt = remainingPendingAll === 0;

  const totalReceivedPrior = totalReceivedAll - totalAcceptedThisReceipt;

  createAuditLog({
    poNumber,
    action: "Goods Receipt Created",
    performedBy: receivedBy,
    previousValue: totalReceivedPrior > 0 ? `Total Received Prior: ${totalReceivedPrior} units` : undefined,
    newValue: `Receipt ${receiptNumber}: ${totalAcceptedThisReceipt} accepted into inventory (${totalRejectedThisReceipt} rejected)`,
    remarks: globalRemarks || `Received ${totalAcceptedThisReceipt} units in this shipment. Cumulative received: ${totalReceivedAll} units (Remaining pending: ${remainingPendingAll} units).`,
    details: JSON.stringify({ receiptNumber, accepted: totalAcceptedThisReceipt, rejected: totalRejectedThisReceipt, pending: remainingPendingAll }),
  });

  if (isFullReceipt) {
    createAuditLog({
      poNumber,
      action: "Full Receipt",
      performedBy: receivedBy,
      previousValue: `Received in this final shipment: ${totalAcceptedThisReceipt} units (Pending was: ${totalAcceptedThisReceipt + totalRejectedThisReceipt})`,
      newValue: `All ordered items fully accounted for (Cumulative Received: ${totalReceivedAll}, Pending: 0)`,
      remarks: totalRejectedAll > 0 ? `Order fulfilled with ${totalRejectedAll} total rejected discrepancy units.` : "Order fully received and fulfilled.",
    });
  } else {
    createAuditLog({
      poNumber,
      action: "Partial Receipt",
      performedBy: receivedBy,
      previousValue: `Total Received Prior: ${totalReceivedPrior} units | Pending Before: ${remainingPendingAll + totalAcceptedThisReceipt + totalRejectedThisReceipt} units`,
      newValue: `Received Now: ${totalAcceptedThisReceipt} units | Cumulative Received to Date: ${totalReceivedAll} units | Remaining Pending: ${remainingPendingAll} units`,
      remarks: `Partial delivery of ${totalAcceptedThisReceipt} units received at depot. Total received to date: ${totalReceivedAll} units, Remaining pending: ${remainingPendingAll} units.`,
    });
  }

  if (totalRejectedThisReceipt > 0) {
    const rejectionSummaries = newReceipt.items
      .filter((it) => it.rejectedQuantity > 0)
      .map((it) => `${it.part}: ${it.rejectedQuantity} units (${it.rejectionReason === "Other" ? it.customRejectionReason : it.rejectionReason})`)
      .join("; ");

    createAuditLog({
      poNumber,
      action: "Rejected Quantity Recorded",
      performedBy: receivedBy,
      newValue: `${totalRejectedThisReceipt} rejected units recorded separately`,
      reason: rejectionSummaries,
      remarks: "Rejected quantities are stored separately for traceability and NOT added to inventory stock.",
    });
  }

  return simulateLatency({ receipt: newReceipt, updatedPo }, 20);
}

// ---------------------------------------------------------------------------
// 2. DELIVERY RESCHEDULING API
// ---------------------------------------------------------------------------

export interface RescheduleDeliveryPayload {
  poNumber: string;
  newDate: string;
  reason: string;
  remarks?: string;
  changedBy?: string;
}

export async function reschedulePoDelivery(
  payload: RescheduleDeliveryPayload
): Promise<{ reschedule: PoDeliveryReschedule; updatedPo: PurchaseOrder }> {
  const { poNumber, newDate, reason, remarks, changedBy = "KSRTC Procurement Officer" } = payload;
  const allOrders = activeOrders.length > 0 ? activeOrders : await getPurchaseOrders();
  const existingPo = allOrders.find((p) => p.poNumber === poNumber);

  if (!existingPo) {
    throw new Error(`Purchase order ${poNumber} not found.`);
  }

  if (["Received", "Closed", "Cancelled"].includes(existingPo.status)) {
    throw new Error(`Cannot reschedule delivery for a ${existingPo.status} purchase order.`);
  }

  if (!newDate) {
    throw new Error("New expected delivery date is required.");
  }

  if (!reason || !reason.trim()) {
    throw new Error("Reason is required whenever the delivery date is changed.");
  }

  const previousDate = existingPo.expectedDelivery || "Not Set";
  const nowStr = new Date().toISOString();

  const newReschedule: PoDeliveryReschedule = {
    id: `resched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    poNumber,
    previousDate,
    newDate,
    reason: reason.trim(),
    changedBy,
    changedAt: nowStr,
    remarks: remarks || "",
  };

  // Save Reschedule record
  const reschedules = loadDeliveryReschedules();
  const poReschedules = [newReschedule, ...reschedules.filter((r) => r.poNumber === poNumber)];
  saveDeliveryReschedules([newReschedule, ...reschedules]);

  const updatedPo: PurchaseOrder = {
    ...existingPo,
    expectedDelivery: newDate,
    isRescheduled: true,
    rescheduleCount: poReschedules.length,
  };

  // Save updated PO
  await updatePurchaseOrder(updatedPo);

  // Automatic Audit Trail Entry
  createAuditLog({
    poNumber,
    action: "Delivery Date Changed",
    performedBy: changedBy,
    previousValue: previousDate,
    newValue: newDate,
    reason: reason.trim(),
    remarks: remarks || `Delivery rescheduled from ${previousDate} to ${newDate}.`,
  });

  return simulateLatency({ reschedule: newReschedule, updatedPo }, 20);
}
