import { DEMO_MODE, ENDPOINTS, simulateLatency } from "./apiClient";
import type { ConnectionStatus, PowerBIConfig } from "../types";

export async function getPowerBIConfig(): Promise<PowerBIConfig> {
  const embedUrl = ENDPOINTS.powerbi;
  if (DEMO_MODE || !embedUrl) {
    return simulateLatency({ embedUrl: "" }, 200);
  }
  return simulateLatency({ embedUrl });
}

export async function checkPowerBIConnection(): Promise<ConnectionStatus> {
  const connected = Boolean(ENDPOINTS.powerbi) && !DEMO_MODE;
  return simulateLatency({
    connected,
    lastChecked: new Date().toISOString(),
    message: connected ? undefined : "No Power BI embed URL configured.",
  });
}
