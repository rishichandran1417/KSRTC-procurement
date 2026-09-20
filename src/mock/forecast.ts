import type { ForecastRequest, ForecastResult, ForecastPoint } from "../types";

const MONTHS = [
  "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03",
  "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09",
];

export function mockForecast(req: ForecastRequest): ForecastResult {
  if (!req.part) {
    return {
      modelName: "N/A",
      mae: 0,
      rmse: 0,
      mape: 0,
      bias: 0,
      horizon: req.horizon,
      series: [],
    };
  }

  const historyMonths = 6;
  const series: ForecastPoint[] = [];
  let base = 380 + (req.part.length % 5) * 40;

  for (let i = 0; i < historyMonths; i++) {
    const jitter = Math.sin(i * 1.3) * 30;
    series.push({ period: MONTHS[i], actual: Math.round(base + jitter) });
  }

  for (let i = 0; i < req.horizon; i++) {
    base += 6;
    const jitter = Math.cos(i * 0.9) * 25;
    const forecast = Math.round(base + jitter);
    series.push({
      period: MONTHS[historyMonths + i] ?? `2026-${10 + i}`,
      forecast,
      lowerBound: Math.round(forecast * 0.88),
      upperBound: Math.round(forecast * 1.12),
    });
  }

  return {
    modelName: "XGBoost (v2.3)",
    mae: 24.6,
    rmse: 31.2,
    mape: 7.8,
    bias: -1.4,
    horizon: req.horizon,
    series,
  };
}
