import { apiClient, ENDPOINTS, simulateLatency } from "./apiClient";
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

function loadStoredInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredInventory(items: InventoryItem[]): void {
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

let activeInventory: InventoryItem[] = loadStoredInventory();

export function clearInventory(): InventoryItem[] {
  activeInventory = [];
  try {
    localStorage.removeItem(INVENTORY_STORAGE_KEY);
  } catch {}
  return [];
}

export async function getInventory(): Promise<InventoryItem[]> {
  activeInventory = loadStoredInventory();

  if (ENDPOINTS.base) {
    try {
      const remote = await apiClient.get<any[]>(`${ENDPOINTS.base}/inventory`);
      if (Array.isArray(remote)) {
        const normalizedRemote: InventoryItem[] = remote.map((r) => {
          const current = r.quantity ?? r.currentStock ?? 0;
          const safety = r.safety_stock ?? r.safetyStock ?? 5;
          const reorder = r.reorder_point ?? r.reorderPoint ?? 10;
          let status: InventoryItem["status"] = r.status || "Healthy";
          if (current <= safety) status = "Critical";
          else if (current <= reorder) status = "Warning";
          else status = "Healthy";

          return {
            id: String(r.id || r.part_id || `remote-${r.sku || r.name}`),
            part: r.name || r.part || r.sku || "Unknown Part",
            depot: r.depot || SINGLE_DEPOT,
            category: r.category || "General",
            currentStock: current,
            safetyStock: safety,
            reorderPoint: reorder,
            forecastDemand: r.forecastDemand ?? r.forecast_demand ?? Math.round(reorder * 1.5),
            daysOfSupply: r.daysOfSupply ?? (current > 0 ? Math.round((current / Math.max(reorder, 1)) * 30) : 0),
            stockoutRisk: status === "Critical" ? "High" : status === "Warning" ? "Medium" : "Low",
            status,
            lastUpdated: r.updated_at ? r.updated_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
            unitCost: r.unit_cost ?? r.unitCost ?? 0,
            primarySupplier: r.primarySupplier || r.supplier || "KSRTC Central Stores",
            notes: r.description || r.notes || "",
          };
        });

        // Merge: local activeInventory overrides or adds to remote list
        const mergedMap = new Map<string, InventoryItem>();
        for (const item of normalizedRemote) {
          mergedMap.set(item.part.toLowerCase(), item);
        }
        for (const localItem of activeInventory) {
          mergedMap.set(localItem.part.toLowerCase(), localItem);
        }

        const merged = Array.from(mergedMap.values());
        saveStoredInventory(merged);
        activeInventory = merged;
        return simulateLatency(merged, 10);
      }
    } catch (err) {
      console.warn("API call to /inventory failed, using cached inventory:", err);
    }
  }

  return simulateLatency([...activeInventory], 50);
}

export async function addInventoryItem(payload: AddInventoryPayload): Promise<InventoryItem> {
  const safety = payload.safetyStock || 50;
  const reorder = payload.reorderPoint || safety + 30;
  const current = payload.currentStock || 0;
  let status: InventoryItem["status"] = "Healthy";
  if (current <= safety) status = "Critical";
  else if (current <= reorder) status = "Warning";

  const cleanPartName = payload.part.trim();
  const newItem: InventoryItem = {
    id: `inv-${Date.now()}`,
    part: cleanPartName,
    depot: payload.depot || SINGLE_DEPOT,
    category: payload.category || "General",
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

  // Always store in activeInventory and localStorage first so it reflects immediately
  activeInventory = loadStoredInventory();
  activeInventory = [newItem, ...activeInventory.filter((i) => i.part.toLowerCase() !== cleanPartName.toLowerCase())];
  saveStoredInventory(activeInventory);

  if (ENDPOINTS.base) {
    // Run backend sync asynchronously in background so UI is never blocked on "Saving..."
    (async () => {
      try {
        const sku = (cleanPartName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "PART") + "-" + Date.now().toString().slice(-4);
        const partRes = await apiClient.post<any>(`${ENDPOINTS.base}/parts`, {
          sku,
          name: cleanPartName,
          category: payload.category || "General",
          unit_cost: payload.unitCost || 0,
          criticality: status === "Critical" ? "Critical" : "Essential",
          description: payload.notes || null,
        });

        if (partRes && partRes.id) {
          newItem.id = String(partRes.id);

          if (current > 0) {
            try {
              await apiClient.post<any>(`${ENDPOINTS.base}/inventory-transactions`, {
                part_id: partRes.id,
                transaction_type: "ADJUSTMENT",
                quantity: current,
                notes: payload.notes || "Initial stock registration",
              });
            } catch (txErr) {
              console.warn("Could not post inventory transaction:", txErr);
            }
          }

          try {
            await apiClient.put<any>(`${ENDPOINTS.base}/inventory/${partRes.id}`, {
              reorder_point: reorder,
              safety_stock: safety,
            });
          } catch (thrErr) {
            console.warn("Could not update inventory thresholds:", thrErr);
          }
        }
      } catch (err) {
        console.warn("Background part creation sync notice:", err);
      }
    })();
  }

  return simulateLatency(newItem, 10);
}

export async function updateInventoryItem(id: string, payload: UpdateInventoryPayload): Promise<InventoryItem> {
  activeInventory = loadStoredInventory();
  const all = await getInventory();
  const existing = all.find((i) => String(i.id) === String(id) || (payload.part && i.part.toLowerCase() === payload.part.toLowerCase()));

  if (!existing) {
    throw new Error(`Inventory item ${id} not found`);
  }

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

  activeInventory = [updated, ...activeInventory.filter((i) => String(i.id) !== String(id) && i.part.toLowerCase() !== updated.part.toLowerCase())];
  saveStoredInventory(activeInventory);

  if (ENDPOINTS.base) {
    const numId = Number(id);
    if (!isNaN(numId)) {
      try {
        await apiClient.put<any>(`${ENDPOINTS.base}/inventory/${numId}`, {
          reorder_point: reorder,
          safety_stock: safety,
        });
      } catch (err) {
        console.warn("API call to update inventory thresholds failed:", err);
      }
    }
  }

  return simulateLatency(updated, 50);
}

export async function adjustInventoryQuantity(id: string, delta: number): Promise<InventoryItem> {
  const all = await getInventory();
  const item = all.find((i) => String(i.id) === String(id));
  if (item) {
    const newQty = Math.max(0, item.currentStock + delta);

    const numId = Number(id);
    if (ENDPOINTS.base && !isNaN(numId)) {
      try {
        await apiClient.post<any>(`${ENDPOINTS.base}/inventory-transactions`, {
          part_id: numId,
          transaction_type: "ADJUSTMENT",
          quantity: delta,
          notes: `Stock adjustment of ${delta > 0 ? "+" : ""}${delta} units`,
        });
      } catch (err) {
        console.warn("Could not post inventory transaction adjustment to server:", err);
      }
    }

    return updateInventoryItem(id, { currentStock: newQty });
  }
  throw new Error(`Inventory item ${id} not found`);
}

export async function receiveItemStockIntoInventory(partName: string, quantityReceived: number): Promise<void> {
  const all = await getInventory();
  const item = all.find((i) => i.part.toLowerCase() === partName.toLowerCase());
  if (item) {
    await adjustInventoryQuantity(item.id, quantityReceived);
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
  if (ENDPOINTS.base) {
    try {
      return await apiClient.get<ConsumptionRecord[]>(`${ENDPOINTS.base}/inventory/${partId}/consumption`);
    } catch {
      return simulateLatency([], 50);
    }
  }
  return simulateLatency([], 50);
}

export async function getPriceHistory(partIdOrName: string): Promise<PriceRecord[]> {
  if (ENDPOINTS.base) {
    try {
      return await apiClient.get<PriceRecord[]>(`${ENDPOINTS.base}/inventory/${partIdOrName}/prices`);
    } catch {
      return simulateLatency([], 50);
    }
  }
  return simulateLatency([], 50);
}
