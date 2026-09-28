import { apiClient, ENDPOINTS, simulateLatency } from "./apiClient";
import { receiveItemStockIntoInventory } from "./inventoryApi";
import { SINGLE_DEPOT_NAME } from "../state/FiltersContext";
import type { PurchaseOrder, PoStatus } from "../types";

const LOCAL_CREATED_POS_KEY = "ksrtc_user_created_pos_v2";
const LOCAL_UPDATED_POS_KEY = "ksrtc_user_updated_pos_v2";
const DUMMY_PO_NUMBERS = ["PO-2026-1087", "PO-2026-0891", "PO-2026-0885", "PO-2026-0870"];

// Load user-created purchase orders from localStorage
export function loadCreatedOrders(): PurchaseOrder[] {
  try {
    const raw = localStorage.getItem(LOCAL_CREATED_POS_KEY);
    if (!raw) {
      // One-time migration from legacy key if any
      const legacyRaw = localStorage.getItem("ksrtc_purchase_orders_clean_v1");
      if (legacyRaw) {
        try {
          const parsed: PurchaseOrder[] = JSON.parse(legacyRaw);
          // Look for any order with PO-2026- or custom non-remote pattern
          const migrated = parsed.filter(
            (p) =>
              p.poNumber &&
              !DUMMY_PO_NUMBERS.includes(p.poNumber) &&
              (p.poNumber.startsWith("PO-") || p.status === "Submitted" || p.isNew)
          );
          if (migrated.length > 0) {
            localStorage.setItem(LOCAL_CREATED_POS_KEY, JSON.stringify(migrated));
            localStorage.removeItem("ksrtc_purchase_orders_clean_v1");
            return migrated;
          }
        } catch {
          // ignore migration error
        }
      }
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCreatedOrders(orders: PurchaseOrder[]): void {
  try {
    localStorage.setItem(LOCAL_CREATED_POS_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error("Failed to save created orders to localStorage:", err);
  }
}

// Load user-modified purchase orders (edits or status changes to remote orders)
export function loadUpdatedOrders(): Record<string, PurchaseOrder> {
  try {
    const raw = localStorage.getItem(LOCAL_UPDATED_POS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveUpdatedOrders(updates: Record<string, PurchaseOrder>): void {
  try {
    localStorage.setItem(LOCAL_UPDATED_POS_KEY, JSON.stringify(updates));
  } catch (err) {
    console.error("Failed to save updated orders to localStorage:", err);
  }
}

let activeOrders: PurchaseOrder[] = [];

/**
 * Calculates the next sequential PO number (e.g. KSRTC/PO/2026/03282)
 */
export function getNextPoNumber(orders: PurchaseOrder[] = activeOrders): string {
  const currentYear = new Date().getFullYear();
  let maxSeq = 3281;

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

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const createdOrders = loadCreatedOrders();
  const updatedOrders = loadUpdatedOrders();

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
                  }))
                : []),
            notes: r.notes || "",
          };
        });

        // Apply any local updates to remote records
        const remoteWithUpdates = normalizedRemote.map((r) => {
          if (updatedOrders[r.poNumber]) {
            return { ...r, ...updatedOrders[r.poNumber] };
          }
          return r;
        });

        // Map to prevent duplicates
        const seenNumbers = new Set<string>();
        const finalOrders: PurchaseOrder[] = [];

        // Put locally created orders FIRST so newly created POs always appear at the top!
        for (const localPo of createdOrders) {
          if (!DUMMY_PO_NUMBERS.includes(localPo.poNumber) && !seenNumbers.has(localPo.poNumber)) {
            finalOrders.push(localPo);
            seenNumbers.add(localPo.poNumber);
          }
        }

        for (const r of remoteWithUpdates) {
          if (!DUMMY_PO_NUMBERS.includes(r.poNumber) && !seenNumbers.has(r.poNumber)) {
            finalOrders.push(r);
            seenNumbers.add(r.poNumber);
          }
        }

        activeOrders = finalOrders;
        return simulateLatency(finalOrders, 10);
      }
    } catch (err: any) {
      console.debug("API call to /purchase-orders deferred, using local orders:", err?.message || err);
    }
  }

  // Fallback if remote fails or not configured
  const seenNumbers = new Set<string>();
  const finalOrders: PurchaseOrder[] = [];
  for (const localPo of createdOrders) {
    if (!DUMMY_PO_NUMBERS.includes(localPo.poNumber) && !seenNumbers.has(localPo.poNumber)) {
      finalOrders.push(localPo);
      seenNumbers.add(localPo.poNumber);
    }
  }
  for (const existing of activeOrders) {
    if (!seenNumbers.has(existing.poNumber)) {
      finalOrders.push(existing);
      seenNumbers.add(existing.poNumber);
    }
  }

  activeOrders = finalOrders;
  return simulateLatency([...finalOrders], 50);
}

export async function createPurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrder> {
  const newPo: PurchaseOrder = {
    ...po,
    isNew: true,
    createdAt: po.createdAt || Date.now(),
  };

  const createdOrders = loadCreatedOrders();
  const updatedCreated = [newPo, ...createdOrders.filter((p) => p.poNumber !== newPo.poNumber)];
  saveCreatedOrders(updatedCreated);

  activeOrders = [newPo, ...activeOrders.filter((p) => p.poNumber !== newPo.poNumber)];

  // Attempt backend persistence in the background
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

  // Support partial and incremental receiving (e.g. ordered 100, received 50):
  if (updated.lines && updated.lines.length > 0) {
    for (let idx = 0; idx < updated.lines.length; idx++) {
      const line = updated.lines[idx];
      const existingLine = existing?.lines?.[idx] || existing?.lines?.find((l) => l.part.toLowerCase() === line.part.toLowerCase());

      // If user selected "Received", fulfill all remaining unreceived units
      if (updated.status === "Received" && (line.receivedQuantity === undefined || line.receivedQuantity < line.quantity)) {
        line.receivedQuantity = line.quantity;
      }

      const currentRec = Number(line.receivedQuantity ?? (updated.status === "Received" ? line.quantity : 0));
      const previousRec = Number(existingLine?.receivedQuantity ?? (existing?.status === "Received" ? (existingLine?.quantity ?? 0) : 0));
      const deltaToReceive = currentRec - previousRec;

      if (deltaToReceive > 0 && line.part) {
        await receiveItemStockIntoInventory(line.part, deltaToReceive, line.category);
      }
    }

    const totalOrdered = updated.lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
    const totalReceived = updated.lines.reduce((s, l) => s + (Number(l.receivedQuantity) || 0), 0);

    if (totalReceived >= totalOrdered && totalOrdered > 0) {
      updated.status = "Received";
      updated.inventoryReceived = true;
    } else if (totalReceived > 0) {
      updated.status = "Partially Received";
      updated.inventoryReceived = false;
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

  // ONLY attempt remote update if this order came from the remote database!
  // Locally created orders (e.g. KSRTC/PO/2026/03282+) do not exist on the remote database.
  if (ENDPOINTS.base && !isCreated) {
    (async () => {
      try {
        const rawId = existing?.id ?? parseInt(updated.poNumber.split("/").pop() || "", 10);
        const remoteId = Number(rawId);
        if (!isNaN(remoteId) && remoteId > 0) {
          await apiClient.patch<any>(`${ENDPOINTS.base}/purchase-orders/${remoteId}/status`, { status: updated.status });
        }
      } catch (err: any) {
        console.debug("Remote PO status update deferred:", err?.message || err);
      }
    })();
  }

  return simulateLatency(updated, 10);
}

export async function updatePoStatus(poNumber: string, status: PoStatus): Promise<PurchaseOrder> {
  const allOrders = activeOrders.length > 0 ? activeOrders : await getPurchaseOrders();
  const existing = allOrders.find((p) => p.poNumber === poNumber);

  const updatedPo: PurchaseOrder = existing
    ? { ...existing, status }
    : {
        poNumber,
        supplier: "KSRTC Depot Vendor",
        depot: SINGLE_DEPOT_NAME,
        poDate: new Date().toISOString().slice(0, 10),
        expectedDelivery: new Date().toISOString().slice(0, 10),
        total: 0,
        status,
        lines: [],
      };

  // If transitioning to "Received" and not already received, update inventory stock
  const wasAlreadyReceived = existing?.status === "Received" || existing?.inventoryReceived;
  if (status === "Received" && !wasAlreadyReceived && updatedPo.lines && updatedPo.lines.length > 0) {
    for (const line of updatedPo.lines) {
      if (line.part && (Number(line.quantity) || 0) > 0) {
        await receiveItemStockIntoInventory(line.part, Number(line.quantity) || 0, line.category);
      }
    }
    updatedPo.inventoryReceived = true;
  }

  await updatePurchaseOrder(updatedPo);

  return simulateLatency(updatedPo, 25);
}

export async function receivePurchaseOrder(poNumber: string): Promise<PurchaseOrder> {
  return updatePoStatus(poNumber, "Received");
}

export async function cancelPurchaseOrder(poNumber: string): Promise<PurchaseOrder> {
  return updatePoStatus(poNumber, "Cancelled");
}
