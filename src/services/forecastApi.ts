import { apiClient, DEMO_MODE, ENDPOINTS, simulateLatency } from "./apiClient";
import { mockForecast } from "../mock/forecast";
import type { ForecastRequest, ForecastResult } from "../types";

/**
 * Sends a forecast request to the external ML forecasting model.
 * Never computes the forecast in the frontend.
 */
export async function getForecast(req: ForecastRequest): Promise<ForecastResult> {
  if (DEMO_MODE || !ENDPOINTS.forecast) {
    return simulateLatency(mockForecast(req), 600);
  }
  return apiClient.post<ForecastResult>(`${ENDPOINTS.forecast}/forecast`, req);
}
