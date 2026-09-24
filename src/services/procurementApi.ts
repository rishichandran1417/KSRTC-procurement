import { apiClient, ENDPOINTS, simulateLatency } from "./apiClient";
import type { ProcurementRequest, ProcurementResult } from "../types";

/**
 * Sends a procurement optimization request to the external PuLP model.
 * Never runs optimization logic in the frontend.
 */
export async function runOptimization(req: ProcurementRequest): Promise<ProcurementResult> {
  if (ENDPOINTS.optimization) {
    return apiClient.post<ProcurementResult>(`${ENDPOINTS.optimization}/optimize`, req);
  }
  return simulateLatency(
    {
      budget: req.budget,
      recommended_spend: 0,
      remaining_budget: req.budget,
      items: [],
    },
    200
  );
}
