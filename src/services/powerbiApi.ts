import { ENDPOINTS, simulateLatency } from "./apiClient";
import type { ConnectionStatus, PowerBIConfig } from "../types";

export async function getPowerBIConfig(): Promise<PowerBIConfig> {
  const embedUrl = ENDPOINTS.powerbi;
  return simulateLatency({ embedUrl: embedUrl || "" }, 100);
}

export async function checkPowerBIConnection(): Promise<ConnectionStatus> {
  const connected = Boolean(ENDPOINTS.powerbi);
  return simulateLatency({
    connected,
    lastChecked: new Date().toISOString(),
    message: connected ? undefined : "No Power BI embed URL configured.",
  });
}
