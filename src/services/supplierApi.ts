import { apiClient, DEMO_MODE, ENDPOINTS, simulateLatency } from "./apiClient";
import { MOCK_SUPPLIERS } from "../mock/purchaseOrders";
import type { Supplier } from "../types";

export async function getSuppliers(): Promise<Supplier[]> {
  if (DEMO_MODE || !ENDPOINTS.base) {
    return simulateLatency(MOCK_SUPPLIERS, 350);
  }
  return apiClient.get<Supplier[]>(`${ENDPOINTS.base}/suppliers`);
}
