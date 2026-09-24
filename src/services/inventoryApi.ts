import { apiClient, isDemoMode, ENDPOINTS, simulateLatency } from "./apiClient";
import { SINGLE_DEPOT } from "../constants";
import type { InventoryItem, AddInventoryPayload, UpdateInventoryPayload, ConsumptionRecord, PriceRecord } from "../types";

const INVENTORY_STORAGE_KEY = "ksrtc_inventory_clean_v1";

// Unconditionally wipe legacy dummy keys from storage
try {
  localStorage.removeItem("ksrtc_inventory_data");
  localStorage.removeItem("ksrtc_inventory_v1");
  localStorage.removeItem("ksrtc_inventory_v2");
} catch {
  // Ignore localStorage access issues
}

const DUMMY_PARTS = [
  "leyland viking",
  "brake drum",
  "radial bus tyre",
  "retread tyre",
  "oil filter",
  "fuel filter",
  "air filter",
  "wheel hub bearing",
  "alternator",
  "starter motor",
  "coolant heavy duty",
  "lubricant oil",
];

function loadStoredInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: InventoryItem[] = JSON.parse(raw);
    return parsed.filter(
      (item) => !DUMMY_PARTS.some((d) => item.part.toLowerCase().includes(d))
    );
  } catch {
    return [];
  }
}

function saveStoredInventory(items: InventoryItem[]): void {
  try {
    const cleanItems = items.filter(
      (item) => !DUMMY_PARTS.some((d) => item.part.toLowerCase().includes(d))
    );
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(cleanItems));
  } catch {
    // Ignore storage quota errors
  }
}

let activeInventory: InventoryItem[] = loadStoredInventory();

export function clearInventory(): InventoryItem[] {
  activeInventory = [];
  try {
    localStorage.removeItem(INVENTORY_STORAGE_KEY);
    localStorage.removeItem("ksrtc_inventory_data");
  } catch {}
  return [];
}

export async function getInventory(): Promise<InventoryItem[]> {
  if (isDemoMode() || !ENDPOINTS.base) {
    return simulateLatency([...activeInventory], 300);
  }
  return apiClient.get<InventoryItem[]>(`${ENDPOINTS.base}/inventory`);
}

export async function addInventoryItem(payload: AddInventoryPayload): Promise<InventoryItem> {
  const safety = payload.safetyStock || 50;
  const reorder = payload.reorderPoint || safety + 30;
  const current = payload.currentStock || 0;
  let status: InventoryItem["status"] = "Healthy";
  if (current <= safety) status = "Critical";
  else if (current <= reorder) status = "Warning";

  const newItem: InventoryItem = {
    id: `inv-${Date.now()}`,
    part: payload.part,
    depot: payload.depot || SINGLE_DEPOT,
    category: payload.category,
    currentStock: current,
    safetyStock: safety,
    reorderPoint: reorder,
    forecastDemand: 100,
    daysOfSupply: Math.round((current / 100) * 30),
    stockoutRisk: status === "Critical" ? "High" : status === "Warning" ? "Medium" : "Low",
    status,
    lastUpdated: new Date().toISOString().slice(0, 10),
    unitCost: payload.unitCost,
    primarySupplier: payload.primarySupplier,
    notes: payload.notes || "Added manually",
  };

  if (isDemoMode() || !ENDPOINTS.base) {
    activeInventory.unshift(newItem);
    saveStoredInventory(activeInventory);
    return simulateLatency(newItem, 400);
  }
  return apiClient.post<InventoryItem>(`${ENDPOINTS.base}/inventory`, payload);
}

export async function updateInventoryItem(id: string, payload: UpdateInventoryPayload): Promise<InventoryItem> {
  if (isDemoMode() || !ENDPOINTS.base) {
    const idx = activeInventory.findIndex((i) => i.id === id);
    if (idx !== -1) {
      const existing = activeInventory[idx];
      const current = payload.currentStock ?? existing.currentStock;
      const safety = payload.safetyStock ?? existing.safetyStock;
      const reorder = payload.reorderPoint ?? existing.reorderPoint;
      let status: InventoryItem["status"] = "Healthy";
      if (current <= safety) status = "Critical";
      else if (current <= reorder) status = "Warning";

      const updated: InventoryItem = {
        ...existing,
        ...payload,
        currentStock: current,
        safetyStock: safety,
        reorderPoint: reorder,
        status,
        stockoutRisk: status === "Critical" ? "High" : status === "Warning" ? "Medium" : "Low",
        daysOfSupply: Math.round((current / Math.max(existing.forecastDemand, 1)) * 30),
        lastUpdated: new Date().toISOString().slice(0, 10),
      };
      activeInventory[idx] = updated;
      saveStoredInventory(activeInventory);
      return simulateLatency(updated, 300);
    }
  }
  return apiClient.put<InventoryItem>(`${ENDPOINTS.base}/inventory/${id}`, payload);
}

export async function adjustInventoryQuantity(id: string, delta: number): Promise<InventoryItem> {
  if (isDemoMode() || !ENDPOINTS.base) {
    const item = activeInventory.find((i) => i.id === id);
    if (item) {
      const newQty = Math.max(0, item.currentStock + delta);
      return updateInventoryItem(id, { currentStock: newQty });
    }
  }
  return apiClient.post<InventoryItem>(`${ENDPOINTS.base}/inventory/${id}/adjust`, { delta });
}

export async function receiveItemStockIntoInventory(partName: string, quantityReceived: number): Promise<void> {
  const item = activeInventory.find((i) => i.part.toLowerCase() === partName.toLowerCase());
  if (item) {
    await updateInventoryItem(item.id, { currentStock: item.currentStock + quantityReceived });
  } else {
    await addInventoryItem({
      part: partName,
      category: "Brake Parts",
      currentStock: quantityReceived,
      safetyStock: 50,
      reorderPoint: 80,
      notes: "Auto-created from Received Purchase Order",
    });
  }
}

export async function getConsumptionHistory(partId: string): Promise<ConsumptionRecord[]> {
  if (isDemoMode() || !ENDPOINTS.base) {
    return simulateLatency([], 200);
  }
  return apiClient.get<ConsumptionRecord[]>(`${ENDPOINTS.base}/inventory/${partId}/consumption`);
}

export async function getPriceHistory(partIdOrName: string): Promise<PriceRecord[]> {
  if (isDemoMode() || !ENDPOINTS.base) {
    return simulateLatency([], 200);
  }
  return apiClient.get<PriceRecord[]>(`${ENDPOINTS.base}/inventory/${partIdOrName}/prices`);
}
