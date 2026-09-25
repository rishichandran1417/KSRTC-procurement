import { apiClient, ENDPOINTS } from "./apiClient";
import type { ForecastRequest, ForecastResult } from "../types";

/**
 * Sends a forecast request strictly to the external ML forecasting microservice.
 * Never computes or generates forecasts in the frontend.
 */
export async function getForecast(req: ForecastRequest): Promise<ForecastResult> {
  if (!ENDPOINTS.forecast) {
    throw new Error(
      "External ML forecasting service is not configured. Please set your ML API URL in Settings or VITE_FORECAST_API_URL."
    );
  }

  return apiClient.post<ForecastResult>(`${ENDPOINTS.forecast}/forecast`, req);
}
