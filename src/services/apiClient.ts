// Central HTTP client. Every service module goes through here — no component
// should ever call fetch() directly.

export type EndpointKey = "base" | "forecast" | "optimization" | "powerbi";

// Clean up any legacy demo mode storage
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("ksrtc_demo_mode");
  } catch {
    // Ignore localStorage access issues
  }
}

const DEFAULT_ENDPOINTS: Record<EndpointKey, string> = {
  base: "https://database-5oe4.onrender.com/api/v1/db",
  forecast: "",
  optimization: "",
  powerbi: "",
};

export function getEndpoint(key: EndpointKey): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(`ksrtc_endpoint_${key}`);
    if (saved !== null && saved.trim() !== "") {
      return saved.trim().replace(/\/+$/, "");
    }
  }
  const envMap: Record<EndpointKey, string | undefined> = {
    base: import.meta.env.VITE_API_BASE_URL,
    forecast: import.meta.env.VITE_FORECAST_API_URL,
    optimization: import.meta.env.VITE_OPTIMIZATION_API_URL,
    powerbi: import.meta.env.VITE_POWERBI_EMBED_URL,
  };
  const val = envMap[key] || DEFAULT_ENDPOINTS[key] || "";
  return val.trim().replace(/\/+$/, "");
}

export function setEndpoint(key: EndpointKey, url: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(`ksrtc_endpoint_${key}`, url.trim().replace(/\/+$/, ""));
    window.dispatchEvent(new Event("ksrtc_config_changed"));
  }
}

export const ENDPOINTS = {
  get base() {
    return getEndpoint("base");
  },
  get forecast() {
    return getEndpoint("forecast");
  },
  get optimization() {
    return getEndpoint("optimization");
  },
  get powerbi() {
    return getEndpoint("powerbi");
  },
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
  } catch (err: any) {
    throw new ApiError(
      `Could not reach ${url}. Check connection, CORS, or protocol (https). Original error: ${err?.message || err}`
    );
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

/** Simulates network latency when needed */
export function simulateLatency<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface ConnectionTestResult {
  ok: boolean;
  status?: number;
  latencyMs: number;
  message: string;
}

/** Performs an actual network test against an endpoint */
export async function testEndpoint(rawUrl: string, probePath = ""): Promise<ConnectionTestResult> {
  const cleanUrl = rawUrl.trim().replace(/\/+$/, "");
  if (!cleanUrl) {
    return { ok: false, latencyMs: 0, message: "URL is empty." };
  }

  // Check protocol mismatch
  if (typeof window !== "undefined" && window.location.protocol === "https:" && cleanUrl.startsWith("http://")) {
    return {
      ok: false,
      latencyMs: 0,
      message: "Mixed Content Error: This app runs on HTTPS. Browsers block unencrypted http:// endpoints. Please use an https:// endpoint or run locally.",
    };
  }

  const targetUrl = probePath ? `${cleanUrl}${probePath.startsWith("/") ? "" : "/"}${probePath}` : cleanUrl;
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "application/json, text/plain, */*" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - start);

    if (res.ok) {
      return {
        ok: true,
        status: res.status,
        latencyMs: latency,
        message: `Connected successfully (HTTP ${res.status}, ${latency}ms)`,
      };
    } else {
      return {
        ok: false,
        status: res.status,
        latencyMs: latency,
        message: `Endpoint responded with HTTP ${res.status}: ${res.statusText || "Error"}`,
      };
    }
  } catch (err: any) {
    const latency = Math.round(performance.now() - start);
    if (err.name === "AbortError") {
      return {
        ok: false,
        latencyMs: latency,
        message: "Connection timed out after 7 seconds. Ensure your server is active and public.",
      };
    }
    return {
      ok: false,
      latencyMs: latency,
      message: `Failed to connect (${err.message || "Network Error"}). Check if CORS is enabled on your backend allowing this origin.`,
    };
  }
}
