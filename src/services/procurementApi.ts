import { apiClient, DEMO_MODE, ENDPOINTS, simulateLatency } from "./apiClient";
import { mockProcurement } from "../mock/procurement";
import type { ProcurementRequest, ProcurementResult } from "../types";

/**
 * Sends a procurement optimization request to the external PuLP model.
 * Never runs optimization logic in the frontend.
 */
export async function runOptimization(req: ProcurementRequest): Promise<ProcurementResult> {
  if (DEMO_MODE || !ENDPOINTS.optimization) {
    return simulateLatency(mockProcurement(req), 900);
  }
  return apiClient.post<ProcurementResult>(`${ENDPOINTS.optimization}/optimize`, req);
}
