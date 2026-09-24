import { apiClient, ENDPOINTS, simulateLatency } from "./apiClient";
import type { ForecastRequest, ForecastResult } from "../types";

/**
 * Sends a forecast request to the external ML forecasting model.
 * Never computes the forecast in the frontend.
 */
export async function getForecast(req: ForecastRequest): Promise<ForecastResult> {
  if (ENDPOINTS.forecast) {
    return apiClient.post<ForecastResult>(`${ENDPOINTS.forecast}/forecast`, req);
  }
  return simulateLatency(
    {
      modelName: "ML Forecasting Engine",
      mae: 0,
      rmse: 0,
      mape: 0,
      bias: 0,
      horizon: req.horizon,
      series: [],
    },
    200
  );
}
