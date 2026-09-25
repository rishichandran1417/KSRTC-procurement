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

export const DEFAULT_KSRTC_PARTS: InventoryItem[] = [
  {
    id: "def-inv-1",
    part: "Brake Lining Set (Leyland Viking / Cheetah)",
    category: "Brake Systems",
    currentStock: 48,
    safetyStock: 30,
    reorderPoint: 50,
    forecastDemand: 65,
    daysOfSupply: 22,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 1850,
    primarySupplier: "Kalyani Brakes & Steering Ltd",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Front/Rear axle standard friction linings",
  },
  {
    id: "def-inv-2",
    part: "Brake Drum Heavy Duty 410mm",
    category: "Brake Systems",
    currentStock: 14,
    safetyStock: 12,
    reorderPoint: 20,
    forecastDemand: 18,
    daysOfSupply: 23,
    stockoutRisk: "Medium",
    status: "Warning",
    unitCost: 4200,
    primarySupplier: "Kalyani Brakes & Steering Ltd",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Grade 250 cast iron drum",
  },
  {
    id: "def-inv-3",
    part: "Clutch Plate Assembly 380mm (Organic)",
    category: "Transmission & Powertrain",
    currentStock: 22,
    safetyStock: 15,
    reorderPoint: 25,
    forecastDemand: 28,
    daysOfSupply: 24,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 5400,
    primarySupplier: "Sundaram Clutches & Spares",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Heavy commercial 6-speed bus transmission",
  },
  {
    id: "def-inv-4",
    part: "Clutch Pressure Plate Heavy Commercial",
    category: "Transmission & Powertrain",
    currentStock: 12,
    safetyStock: 10,
    reorderPoint: 18,
    forecastDemand: 16,
    daysOfSupply: 23,
    stockoutRisk: "Medium",
    status: "Warning",
    unitCost: 6800,
    primarySupplier: "Sundaram Clutches & Spares",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Diaphragm spring pressure assembly",
  },
  {
    id: "def-inv-5",
    part: "Engine Oil Filter Spin-On",
    category: "Filters & Lubrication",
    currentStock: 85,
    safetyStock: 40,
    reorderPoint: 60,
    forecastDemand: 95,
    daysOfSupply: 27,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 480,
    primarySupplier: "Bosch Rexroth Filters & Injection",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "20 micron filtration rated",
  },
  {
    id: "def-inv-6",
    part: "Primary Fuel Filter Water Separator Cartridge",
    category: "Filters & Lubrication",
    currentStock: 62,
    safetyStock: 35,
    reorderPoint: 50,
    forecastDemand: 70,
    daysOfSupply: 27,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 650,
    primarySupplier: "Bosch Rexroth Filters & Injection",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Clear bowl water separator replacement",
  },
  {
    id: "def-inv-7",
    part: "Secondary Diesel Filter Element",
    category: "Filters & Lubrication",
    currentStock: 74,
    safetyStock: 40,
    reorderPoint: 55,
    forecastDemand: 80,
    daysOfSupply: 28,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 420,
    primarySupplier: "Bosch Rexroth Filters & Injection",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Fine fuel filtration stage 2",
  },
  {
    id: "def-inv-8",
    part: "Engine Air Filter Primary Radial Seal Element",
    category: "Filters & Lubrication",
    currentStock: 38,
    safetyStock: 25,
    reorderPoint: 40,
    forecastDemand: 45,
    daysOfSupply: 25,
    stockoutRisk: "Medium",
    status: "Warning",
    unitCost: 1450,
    primarySupplier: "Bosch Rexroth Filters & Injection",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "High dust capacity intake filter",
  },
  {
    id: "def-inv-9",
    part: "Engine Air Filter Secondary Safety Element",
    category: "Filters & Lubrication",
    currentStock: 28,
    safetyStock: 20,
    reorderPoint: 30,
    forecastDemand: 32,
    daysOfSupply: 26,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 890,
    primarySupplier: "Bosch Rexroth Filters & Injection",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Internal safety core filter",
  },
  {
    id: "def-inv-10",
    part: "Front Leaf Spring Main Leaf (No. 1)",
    category: "Suspension & Steering",
    currentStock: 18,
    safetyStock: 15,
    reorderPoint: 22,
    forecastDemand: 20,
    daysOfSupply: 27,
    stockoutRisk: "Medium",
    status: "Warning",
    unitCost: 3100,
    primarySupplier: "Global Auto Industries & Co",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Parabolic spring steel with military wrap eye",
  },
  {
    id: "def-inv-11",
    part: "Rear Helper Leaf Spring Assembly (9 Leaf)",
    category: "Suspension & Steering",
    currentStock: 11,
    safetyStock: 10,
    reorderPoint: 16,
    forecastDemand: 15,
    daysOfSupply: 22,
    stockoutRisk: "Medium",
    status: "Warning",
    unitCost: 7800,
    primarySupplier: "Global Auto Industries & Co",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Heavy overload rated rear suspension",
  },
  {
    id: "def-inv-12",
    part: "Tie Rod End Assembly LH/RH Set",
    category: "Suspension & Steering",
    currentStock: 34,
    safetyStock: 20,
    reorderPoint: 30,
    forecastDemand: 35,
    daysOfSupply: 29,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 1650,
    primarySupplier: "Kalyani Brakes & Steering Ltd",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Precision ball joint assembly",
  },
  {
    id: "def-inv-13",
    part: "King Pin Kit with Needle Roller Bearings",
    category: "Suspension & Steering",
    currentStock: 15,
    safetyStock: 12,
    reorderPoint: 20,
    forecastDemand: 18,
    daysOfSupply: 25,
    stockoutRisk: "Medium",
    status: "Warning",
    unitCost: 3400,
    primarySupplier: "National Bearings & Spares Corp",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Front axle knuckle steering king pin",
  },
  {
    id: "def-inv-14",
    part: "Heavy Commercial Radial Bus Tyre 295/80 R22.5",
    category: "Tyres & Retreading",
    currentStock: 26,
    safetyStock: 25,
    reorderPoint: 40,
    forecastDemand: 42,
    daysOfSupply: 19,
    stockoutRisk: "Medium",
    status: "Warning",
    unitCost: 19500,
    primarySupplier: "Apollo Radial Fleet Solutions",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "All-position steer and drive radial tyre",
  },
  {
    id: "def-inv-15",
    part: "Alternator 28V 80A Heavy Commercial Bus",
    category: "Electrical & Sensors",
    currentStock: 8,
    safetyStock: 6,
    reorderPoint: 12,
    forecastDemand: 10,
    daysOfSupply: 24,
    stockoutRisk: "Medium",
    status: "Warning",
    unitCost: 12800,
    primarySupplier: "Lucas TVS Electricals Division",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Heavy charging output for city and highway transit",
  },
  {
    id: "def-inv-16",
    part: "Starter Motor 24V 4.5kW Pre-Engaged",
    category: "Electrical & Sensors",
    currentStock: 7,
    safetyStock: 5,
    reorderPoint: 10,
    forecastDemand: 9,
    daysOfSupply: 23,
    stockoutRisk: "Medium",
    status: "Warning",
    unitCost: 14200,
    primarySupplier: "Lucas TVS Electricals Division",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "High torque planetary gear starter",
  },
  {
    id: "def-inv-17",
    part: "Heavy Commercial Battery 12V 180Ah (Pair 24V)",
    category: "Electrical & Sensors",
    currentStock: 16,
    safetyStock: 12,
    reorderPoint: 20,
    forecastDemand: 18,
    daysOfSupply: 27,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 11500,
    primarySupplier: "Lucas TVS Electricals Division",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Low maintenance commercial starting battery",
  },
  {
    id: "def-inv-18",
    part: "Air Brake Dual Brake Valve (Foot Valve)",
    category: "Air Brake & Pneumatics",
    currentStock: 14,
    safetyStock: 10,
    reorderPoint: 16,
    forecastDemand: 15,
    daysOfSupply: 28,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 3800,
    primarySupplier: "Wabco Pneumatics India Ltd",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Standard dual-circuit graduated brake control",
  },
  {
    id: "def-inv-19",
    part: "Air Compressor Unloader / Governor Valve",
    category: "Air Brake & Pneumatics",
    currentStock: 19,
    safetyStock: 12,
    reorderPoint: 18,
    forecastDemand: 16,
    daysOfSupply: 36,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 2400,
    primarySupplier: "Wabco Pneumatics India Ltd",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "System pressure regulator valve 8.5 bar",
  },
  {
    id: "def-inv-20",
    part: "Wheel Hub Bearing Set (Front Inner/Outer)",
    category: "Bearings & Transmission",
    currentStock: 42,
    safetyStock: 25,
    reorderPoint: 35,
    forecastDemand: 40,
    daysOfSupply: 32,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 2200,
    primarySupplier: "National Bearings & Spares Corp",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Taper roller precision bearing matched pair",
  },
  {
    id: "def-inv-21",
    part: "Universal Joint Cross Kit (Propeller Shaft)",
    category: "Propeller Shaft & Axles",
    currentStock: 30,
    safetyStock: 20,
    reorderPoint: 28,
    forecastDemand: 32,
    daysOfSupply: 28,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 1750,
    primarySupplier: "Rane Madras Driveline Components",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Heavy duty needle bearing cross with grease zerk",
  },
  {
    id: "def-inv-22",
    part: "Engine Water Pump Assembly with Pulley",
    category: "Cooling & Radiator",
    currentStock: 9,
    safetyStock: 8,
    reorderPoint: 14,
    forecastDemand: 12,
    daysOfSupply: 23,
    stockoutRisk: "Medium",
    status: "Warning",
    unitCost: 4600,
    primarySupplier: "Ashok Leyland Genuine Parts Depot",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Cast iron housing with ceramic mechanical seal",
  },
  {
    id: "def-inv-23",
    part: "Radiator Aluminium Heavy Duty (6-Cylinder Bus)",
    category: "Cooling & Radiator",
    currentStock: 5,
    safetyStock: 4,
    reorderPoint: 8,
    forecastDemand: 6,
    daysOfSupply: 25,
    stockoutRisk: "Medium",
    status: "Warning",
    unitCost: 16500,
    primarySupplier: "Ashok Leyland Genuine Parts Depot",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "High heat rejection multi-core radiator",
  },
  {
    id: "def-inv-24",
    part: "Poly-V Fan & Alternator Belt (8PK 1420)",
    category: "Engine Components",
    currentStock: 55,
    safetyStock: 30,
    reorderPoint: 45,
    forecastDemand: 50,
    daysOfSupply: 33,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 750,
    primarySupplier: "Lucas TVS Electricals Division",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "EPDM synthetic ribbed automotive drive belt",
  },
  {
    id: "def-inv-25",
    part: "Hydraulic Shock Absorber (Front Heavy Duty)",
    category: "Suspension & Steering",
    currentStock: 24,
    safetyStock: 16,
    reorderPoint: 25,
    forecastDemand: 26,
    daysOfSupply: 28,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 2600,
    primarySupplier: "Global Auto Industries & Co",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Twin tube telescopic dampener",
  },
  {
    id: "def-inv-26",
    part: "LED Headlamp Assembly 24V High Intensity",
    category: "Electrical & Sensors",
    currentStock: 32,
    safetyStock: 18,
    reorderPoint: 28,
    forecastDemand: 30,
    daysOfSupply: 32,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 2950,
    primarySupplier: "Kerala Electrical & Allied (KEL)",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Shock and vibration resistant sealed beam",
  },
  {
    id: "def-inv-27",
    part: "Wiper Blade Heavy Duty 28 Inch (700mm)",
    category: "Hardware & Body",
    currentStock: 68,
    safetyStock: 35,
    reorderPoint: 50,
    forecastDemand: 60,
    daysOfSupply: 34,
    stockoutRisk: "Low",
    status: "Healthy",
    unitCost: 350,
    primarySupplier: "Sree Fasteners & Tools Ltd",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Graphite coated natural rubber curved blade",
  }
];

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

  // Create combined map starting with default standard items
  const map = new Map<string, InventoryItem>();
  for (const item of DEFAULT_KSRTC_PARTS) {
    map.set(item.part.toLowerCase(), item);
  }

  // Overlay local active inventory
  for (const item of activeInventory) {
    map.set(item.part.toLowerCase(), item);
  }

  if (ENDPOINTS.base) {
    try {
      const remote = await apiClient.get<any[]>(`${ENDPOINTS.base}/inventory`);
      if (Array.isArray(remote) && remote.length > 0) {
        for (const r of remote) {
          const current = r.quantity ?? r.currentStock ?? 0;
          const safety = r.safety_stock ?? r.safetyStock ?? 5;
          const reorder = r.reorder_point ?? r.reorderPoint ?? 10;
          let status: InventoryItem["status"] = r.status || "Healthy";
          if (current <= safety) status = "Critical";
          else if (current <= reorder) status = "Warning";
          else status = "Healthy";

          const norm: InventoryItem = {
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
          map.set(norm.part.toLowerCase(), norm);
        }
      }
    } catch (err) {
      console.warn("API call to /inventory failed, using cached inventory:", err);
    }
  }

  const result = Array.from(map.values());
  saveStoredInventory(result);
  activeInventory = result;
  return simulateLatency(result, 15);
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
      (async () => {
        try {
          await apiClient.put<any>(`${ENDPOINTS.base}/inventory/${numId}`, {
            reorder_point: reorder,
            safety_stock: safety,
          });
        } catch (err) {
          console.warn("API call to update inventory thresholds failed:", err);
        }
      })();
    }
  }

  return simulateLatency(updated, 20);
}

export async function adjustInventoryQuantity(id: string, delta: number): Promise<InventoryItem> {
  const all = await getInventory();
  const item = all.find((i) => String(i.id) === String(id));
  if (item) {
    const newQty = Math.max(0, item.currentStock + delta);

    const numId = Number(id);
    if (ENDPOINTS.base && !isNaN(numId)) {
      (async () => {
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
      })();
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
