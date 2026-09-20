import { apiClient, DEMO_MODE, ENDPOINTS, simulateLatency } from "./apiClient";
import { mockPriceHistory } from "../mock/inventory";
import type { PriceRecord } from "../types";

export async function getPriceHistoryForPart(part: string): Promise<PriceRecord[]> {
  if (DEMO_MODE || !ENDPOINTS.base) {
    return simulateLatency(mockPriceHistory(), 300);
  }
  return apiClient.get<PriceRecord[]>(`${ENDPOINTS.base}/prices?part=${encodeURIComponent(part)}`);
}
