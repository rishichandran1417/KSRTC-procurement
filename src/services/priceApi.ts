import { apiClient, ENDPOINTS, simulateLatency } from "./apiClient";
import type { PriceRecord } from "../types";

export async function getPriceHistoryForPart(part: string): Promise<PriceRecord[]> {
  if (ENDPOINTS.base) {
    try {
      return await apiClient.get<PriceRecord[]>(`${ENDPOINTS.base}/prices?part=${encodeURIComponent(part)}`);
    } catch {
      return simulateLatency([], 100);
    }
  }
  return simulateLatency([], 100);
}
