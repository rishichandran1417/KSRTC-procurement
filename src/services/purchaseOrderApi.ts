import { apiClient, ENDPOINTS, simulateLatency } from "./apiClient";
import { receiveItemStockIntoInventory } from "./inventoryApi";
import { SINGLE_DEPOT_NAME } from "../state/FiltersContext";
import type { PurchaseOrder, PoStatus } from "../types";

const PO_STORAGE_KEY = "ksrtc_purchase_orders_clean_v1";

// Unconditionally wipe legacy dummy keys from storage
try {
  localStorage.removeItem("ksrtc_purchase_orders_data");
  localStorage.removeItem("ksrtc_purchase_orders_v1");
  localStorage.removeItem("ksrtc_purchase_orders_v2");
} catch {
  // Ignore localStorage access issues
}

const DUMMY_PO_NUMBERS = ["PO-2026-1087", "PO-2026-0891", "PO-2026-0885", "PO-2026-0870"];

function loadStoredOrders(): PurchaseOrder[] {
  try {
    const raw = localStorage.getItem(PO_STORAGE_KEY);
    if (!raw) return [];
    const parsed: PurchaseOrder[] = JSON.parse(raw);
    return parsed.filter((po) => !DUMMY_PO_NUMBERS.includes(po.poNumber));
  } catch {
    return [];
  }
}

function saveStoredOrders(orders: PurchaseOrder[]): void {
  try {
    const cleanOrders = orders.filter((po) => !DUMMY_PO_NUMBERS.includes(po.poNumber));
    localStorage.setItem(PO_STORAGE_KEY, JSON.stringify(cleanOrders));
  } catch {
    // Ignore storage quota errors
  }
}

let activeOrders: PurchaseOrder[] = loadStoredOrders();

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  activeOrders = loadStoredOrders();

  if (ENDPOINTS.base) {
    try {
      const remote = await apiClient.get<any[]>(`${ENDPOINTS.base}/purchase-orders`);
      if (Array.isArray(remote)) {
        const normalizedRemote: PurchaseOrder[] = remote.map((r) => ({
          poNumber: r.poNumber || r.po_number || `PO-${r.id}`,
          supplier: r.supplier || r.supplier_name || "KSRTC Central Stores",
          depot: r.depot || SINGLE_DEPOT_NAME,
          poDate: r.poDate || (r.order_date ? r.order_date.slice(0, 10) : new Date().toISOString().slice(0, 10)),
          expectedDelivery: r.expectedDelivery || (r.expected_date ? r.expected_date.slice(0, 10) : new Date().toISOString().slice(0, 10)),
          total: r.total ?? r.total_value ?? 0,
          status: r.status || "Submitted",
          lines: r.lines || (r.items ? r.items.map((it: any) => ({
            part: it.part || it.part_name || `Part #${it.part_id}`,
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || it.unit_cost || 0,
            totalCost: it.total_cost || ((it.quantity || 1) * (it.unitPrice || it.unit_cost || 0)),
          })) : []),
          notes: r.notes || "",
        }));

        // Merge: local activeOrders take precedence so newly created or status-updated orders never disappear
        const mergedMap = new Map<string, PurchaseOrder>();
        for (const r of normalizedRemote) {
          if (!DUMMY_PO_NUMBERS.includes(r.poNumber)) {
            mergedMap.set(r.poNumber, r);
          }
        }
        for (const localPo of activeOrders) {
          if (!DUMMY_PO_NUMBERS.includes(localPo.poNumber)) {
            mergedMap.set(localPo.poNumber, localPo);
          }
        }

        const merged = Array.from(mergedMap.values());
        saveStoredOrders(merged);
        activeOrders = merged;
        return simulateLatency(merged, 10);
      }
    } catch (err) {
      console.warn("API call to /purchase-orders failed, using cached orders:", err);
    }
  }

  return simulateLatency([...activeOrders], 50);
}

export async function createPurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrder> {
  activeOrders = loadStoredOrders();
  activeOrders = [po, ...activeOrders.filter((p) => p.poNumber !== po.poNumber)];
  saveStoredOrders(activeOrders);

  if (ENDPOINTS.base) {
    (async () => {
      try {
        await apiClient.post<PurchaseOrder>(`${ENDPOINTS.base}/purchase-orders`, po);
      } catch (err) {
        console.warn("API call to create purchase order background notice:", err);
      }
    })();
  }

  return simulateLatency(po, 10);
}

export async function updatePurchaseOrder(updated: PurchaseOrder): Promise<PurchaseOrder> {
  activeOrders = loadStoredOrders();
  activeOrders = [updated, ...activeOrders.filter((p) => p.poNumber !== updated.poNumber)];
  saveStoredOrders(activeOrders);

  if (ENDPOINTS.base) {
    (async () => {
      try {
        await apiClient.put<PurchaseOrder>(`${ENDPOINTS.base}/purchase-orders/${updated.poNumber}`, updated);
      } catch (err) {
        console.warn("API call to update purchase order background notice:", err);
      }
    })();
  }

  return simulateLatency(updated, 10);
}

export async function updatePoStatus(poNumber: string, status: PoStatus): Promise<PurchaseOrder> {
  activeOrders = loadStoredOrders();
  const allOrders = await getPurchaseOrders();
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

  activeOrders = [updatedPo, ...activeOrders.filter((p) => p.poNumber !== poNumber)];
  saveStoredOrders(activeOrders);

  // When PO is received, update inventory stock
  if (status === "Received" && updatedPo.lines) {
    for (const line of updatedPo.lines) {
      await receiveItemStockIntoInventory(line.part, line.quantity);
    }
  }

  if (ENDPOINTS.base) {
    try {
      await apiClient.put<PurchaseOrder>(`${ENDPOINTS.base}/purchase-orders/${poNumber}/status`, { status });
    } catch (err) {
      console.warn("API call to update purchase order status failed, updated locally:", err);
    }
  }

  return simulateLatency(updatedPo, 50);
}

export async function receivePurchaseOrder(poNumber: string): Promise<PurchaseOrder> {
  return updatePoStatus(poNumber, "Received");
}

export async function cancelPurchaseOrder(poNumber: string): Promise<PurchaseOrder> {
  return updatePoStatus(poNumber, "Cancelled");
}
