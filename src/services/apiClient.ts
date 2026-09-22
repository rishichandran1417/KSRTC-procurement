// Central HTTP client. Every service module goes through here — no component
// should ever call fetch() directly.

export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE ?? "true") === "true";

export const ENDPOINTS = {
  base: import.meta.env.VITE_API_BASE_URL ?? "",
  forecast: import.meta.env.VITE_FORECAST_API_URL ?? "",
  optimization: import.meta.env.VITE_OPTIMIZATION_API_URL ?? "",
  powerbi: import.meta.env.VITE_POWERBI_EMBED_URL ?? "",
};

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new ApiError("Could not reach the service. Check the connection and try again.");
  }

  if (!response.ok) {
    throw new ApiError(`Request failed (${response.status})`, response.status);
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(url: string) => request<T>(url, { method: "GET" }),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
};

/** Simulates realistic network latency for mock/demo responses. */
export function simulateLatency<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
