import { apiClient, DEMO_MODE, ENDPOINTS, simulateLatency } from "./apiClient";
import { MOCK_PURCHASE_ORDERS } from "../mock/purchaseOrders";
import { receiveItemStockIntoInventory } from "./inventoryApi";
import type { PurchaseOrder, PoStatus } from "../types";

let activeOrders: PurchaseOrder[] = [...MOCK_PURCHASE_ORDERS];

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  if (DEMO_MODE || !ENDPOINTS.base) {
    return simulateLatency([...activeOrders], 300);
  }
  return apiClient.get<PurchaseOrder[]>(`${ENDPOINTS.base}/purchase-orders`);
}

export async function createPurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrder> {
  if (DEMO_MODE || !ENDPOINTS.base) {
    activeOrders.unshift(po);
    return simulateLatency(po, 400);
  }
  return apiClient.post<PurchaseOrder>(`${ENDPOINTS.base}/purchase-orders`, po);
}

export async function updatePoStatus(poNumber: string, status: PoStatus): Promise<PurchaseOrder> {
  if (DEMO_MODE || !ENDPOINTS.base) {
    const idx = activeOrders.findIndex((p) => p.poNumber === poNumber);
    if (idx !== -1) {
      const existing = activeOrders[idx];
      const updated = { ...existing, status };
      activeOrders[idx] = updated;

      // When PO is received, update inventory stock
      if (status === "Received") {
        for (const line of existing.lines) {
          await receiveItemStockIntoInventory(line.part, line.quantity);
        }
      }

      return simulateLatency(updated, 300);
    }
  }
  return apiClient.put<PurchaseOrder>(`${ENDPOINTS.base}/purchase-orders/${poNumber}/status`, { status });
}

export async function receivePurchaseOrder(poNumber: string): Promise<PurchaseOrder> {
  return updatePoStatus(poNumber, "Received");
}

export async function cancelPurchaseOrder(poNumber: string): Promise<PurchaseOrder> {
  return updatePoStatus(poNumber, "Cancelled");
}
