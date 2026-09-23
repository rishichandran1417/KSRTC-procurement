import { apiClient, DEMO_MODE, ENDPOINTS, simulateLatency } from "./apiClient";
import type { PriceRecord } from "../types";

export async function getPriceHistoryForPart(part: string): Promise<PriceRecord[]> {
  if (DEMO_MODE || !ENDPOINTS.base) {
    return simulateLatency([], 300);
  }
  return apiClient.get<PriceRecord[]>(`${ENDPOINTS.base}/prices?part=${encodeURIComponent(part)}`);
}
