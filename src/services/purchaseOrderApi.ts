import { apiClient, ENDPOINTS, simulateLatency } from "./apiClient";
import { receiveItemStockIntoInventory } from "./inventoryApi";
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
  if (ENDPOINTS.base) {
    try {
      return await apiClient.get<PurchaseOrder[]>(`${ENDPOINTS.base}/purchase-orders`);
    } catch (err) {
      console.warn("API call to /purchase-orders failed, using cached orders:", err);
    }
  }
  return simulateLatency([...activeOrders], 100);
}

export async function createPurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrder> {
  if (ENDPOINTS.base) {
    try {
      return await apiClient.post<PurchaseOrder>(`${ENDPOINTS.base}/purchase-orders`, po);
    } catch (err) {
      console.warn("API call to create purchase order failed, saving locally:", err);
    }
  }
  activeOrders.unshift(po);
  saveStoredOrders(activeOrders);
  return simulateLatency(po, 100);
}

export async function updatePoStatus(poNumber: string, status: PoStatus): Promise<PurchaseOrder> {
  if (ENDPOINTS.base) {
    try {
      const res = await apiClient.put<PurchaseOrder>(`${ENDPOINTS.base}/purchase-orders/${poNumber}/status`, { status });
      return res;
    } catch (err) {
      console.warn("API call to update purchase order status failed, saving locally:", err);
    }
  }
  const idx = activeOrders.findIndex((p) => p.poNumber === poNumber);
  if (idx !== -1) {
    const existing = activeOrders[idx];
    const updated = { ...existing, status };
    activeOrders[idx] = updated;
    saveStoredOrders(activeOrders);

    // When PO is received, update inventory stock
    if (status === "Received") {
      for (const line of existing.lines) {
        await receiveItemStockIntoInventory(line.part, line.quantity);
      }
    }

    return simulateLatency(updated, 100);
  }
  throw new Error(`Order ${poNumber} not found`);
}

export async function receivePurchaseOrder(poNumber: string): Promise<PurchaseOrder> {
  return updatePoStatus(poNumber, "Received");
}

export async function cancelPurchaseOrder(poNumber: string): Promise<PurchaseOrder> {
  return updatePoStatus(poNumber, "Cancelled");
}
