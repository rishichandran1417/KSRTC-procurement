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
  },
  {
    id: "def-inv-28",
    part: "AC Compressor Assembly (KSRTC Std Bus / Heavy Commercial)",
    category: "HVAC & Climate Control",
    currentStock: 3,
    safetyStock: 5,
    reorderPoint: 8,
    forecastDemand: 6,
    daysOfSupply: 15,
    stockoutRisk: "High",
    status: "Critical",
    unitCost: 28500,
    primarySupplier: "Subros Thermal Solutions Ltd",
    depot: SINGLE_DEPOT,
    lastUpdated: "2026-09-25",
    notes: "Direct drive heavy commercial AC compressor 10S20P 24V for Leyland & Tata bus fleet",
  }
];

const REMOTE_INVENTORY_CACHE_KEY = "ksrtc_remote_inventory_cache_v2";

function loadRemoteCache(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(REMOTE_INVENTORY_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveRemoteCache(items: InventoryItem[]): void {
  try {
    localStorage.setItem(REMOTE_INVENTORY_CACHE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

let cachedRemoteItems: InventoryItem[] = loadRemoteCache();
let lastRemoteFetchTime = 0;
let lastRemoteFailureTime = 0;
let isRemoteFetching = false;

function parseRemoteItem(r: any): InventoryItem {
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
}

async function fetchRemoteInventoryInBackground(): Promise<void> {
  if (!ENDPOINTS.base || isRemoteFetching) return;

  const now = Date.now();
  // Circuit breaker: wait at least 60s if last request failed to avoid hammering a cold/sleeping instance
  if (now - lastRemoteFailureTime < 60000) return;
  // Cache TTL: wait at least 45s between successful fetches
  if (now - lastRemoteFetchTime < 45000) return;

  isRemoteFetching = true;
  try {
    const remote = await apiClient.get<any[]>(`${ENDPOINTS.base}/inventory`);
    if (Array.isArray(remote) && remote.length > 0) {
      cachedRemoteItems = remote.map(parseRemoteItem);
      saveRemoteCache(cachedRemoteItems);
      lastRemoteFetchTime = Date.now();
    }
  } catch (err: any) {
    lastRemoteFailureTime = Date.now();
    console.debug("Backend /inventory sync deferred (server cold start or offline):", err?.message || err);
  } finally {
    isRemoteFetching = false;
  }
}

let activeInventory: InventoryItem[] = loadStoredInventory();

export function clearInventory(): InventoryItem[] {
  activeInventory = [];
  try {
    localStorage.removeItem(INVENTORY_STORAGE_KEY);
    localStorage.removeItem(REMOTE_INVENTORY_CACHE_KEY);
  } catch {}
  return [];
}

export async function getInventory(): Promise<InventoryItem[]> {
  activeInventory = loadStoredInventory();

  // Create combined map starting with default standard items
  const map = new Map<string, InventoryItem>();
  for (const item of DEFAULT_KSRTC_PARTS) {
    map.set(item.part.toLowerCase().trim(), { ...item });
  }

  // Overlay cached remote items without waiting/blocking UI
  for (const rItem of cachedRemoteItems) {
    map.set(rItem.part.toLowerCase().trim(), { ...rItem });
  }

  // User's activeInventory MUST take top precedence so manual edits, adjustments, and additions persist!
  for (const item of activeInventory) {
    const key = item.part.toLowerCase().trim();
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        ...item,
        currentStock: item.currentStock,
        safetyStock: item.safetyStock,
        reorderPoint: item.reorderPoint,
        status: item.status,
        daysOfSupply: item.daysOfSupply,
        stockoutRisk: item.stockoutRisk,
        lastUpdated: item.lastUpdated || new Date().toISOString().slice(0, 10),
      });
    } else {
      map.set(key, { ...item });
    }
  }

  // Trigger non-blocking background revalidation if needed
  fetchRemoteInventoryInBackground().catch(() => {});

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
    forecastDemand: Math.round(reorder * 1.5),
    daysOfSupply: current > 0 ? Math.round((current / Math.max(reorder, 1)) * 30) : 0,
    stockoutRisk: status === "Critical" ? "High" : status === "Warning" ? "Medium" : "Low",
    status,
    lastUpdated: new Date().toISOString().slice(0, 10),
    unitCost: payload.unitCost || 0,
    primarySupplier: payload.primarySupplier || "KSRTC Central Stores",
    notes: payload.notes || "Added manually",
  };

  // Always store in activeInventory and localStorage first so it reflects immediately
  activeInventory = loadStoredInventory();
  activeInventory = [newItem, ...activeInventory.filter((i) => i.part.toLowerCase().trim() !== cleanPartName.toLowerCase())];
  saveStoredInventory(activeInventory);

  if (ENDPOINTS.base) {
    // Run backend sync asynchronously in background so UI is never blocked
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
            } catch (txErr: any) {
              console.debug("Could not post inventory transaction:", txErr?.message || txErr);
            }
          }

          try {
            await apiClient.put<any>(`${ENDPOINTS.base}/inventory/${partRes.id}`, {
              reorder_point: reorder,
              safety_stock: safety,
            });
          } catch (thrErr: any) {
            console.debug("Could not update inventory thresholds:", thrErr?.message || thrErr);
          }
        }
      } catch (err: any) {
        console.debug("Background part creation sync notice:", err?.message || err);
      }
    })();
  }

  return simulateLatency(newItem, 10);
}

function normalizePartName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // remove parenthetical remarks
    .replace(/[-_/]/g, " ")
    .replace(/\b(ksrtc|std|bus|heavy|commercial|variant|leyland|viking|cheetah|fleet|oem|set|assembly)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findMatchingInventoryItem(items: InventoryItem[], queryName: string): InventoryItem | undefined {
  if (!queryName) return undefined;
  const clean = queryName.toLowerCase().trim();

  // 1. Exact match
  const exact = items.find((i) => i.part.toLowerCase().trim() === clean);
  if (exact) return exact;

  // 2. Direct ID match if query has digits
  const idMatch = clean.match(/\d+/);
  if (idMatch) {
    const num = idMatch[0];
    const byId = items.find(
      (i) => String(i.id) === num || i.id === `remote-${num}` || i.id === `def-inv-${num}`
    );
    if (byId) return byId;
  }

  // 3. Normalized core match
  const normQuery = normalizePartName(clean);
  if (normQuery.length >= 3) {
    const normExact = items.find((i) => normalizePartName(i.part) === normQuery);
    if (normExact) return normExact;

    // 4. Substring containment
    const subMatch = items.find((i) => {
      const normItem = normalizePartName(i.part);
      return (
        (normItem.length >= 4 && normQuery.includes(normItem)) ||
        (normQuery.length >= 4 && normItem.includes(normQuery))
      );
    });
    if (subMatch) return subMatch;

    // 5. Significant word overlap
    const words = normQuery.split(" ").filter((w) => w.length >= 3);
    if (words.length > 0) {
      let bestItem: InventoryItem | undefined;
      let maxOverlap = 0;
      for (const i of items) {
        const itemNorm = normalizePartName(i.part);
        const overlap = words.filter((w) => itemNorm.includes(w)).length;
        if (overlap > maxOverlap && overlap >= Math.min(2, words.length)) {
          maxOverlap = overlap;
          bestItem = i;
        }
      }
      if (bestItem) return bestItem;
    }
  }

  return undefined;
}

export async function updateInventoryItem(id: string, payload: UpdateInventoryPayload): Promise<InventoryItem> {
  const cleanName = (payload.part || "").toLowerCase().trim();

  let existing = activeInventory.find(
    (i) => String(i.id) === String(id) || (cleanName && i.part.toLowerCase().trim() === cleanName)
  );

  if (!existing) {
    existing = cachedRemoteItems.find(
      (i) => String(i.id) === String(id) || (cleanName && i.part.toLowerCase().trim() === cleanName)
    );
  }

  if (!existing) {
    const stored = loadStoredInventory();
    existing = stored.find(
      (i) => String(i.id) === String(id) || (cleanName && i.part.toLowerCase().trim() === cleanName)
    );
  }

  if (!existing) {
    existing = DEFAULT_KSRTC_PARTS.find(
      (i) => String(i.id) === String(id) || (cleanName && i.part.toLowerCase().trim() === cleanName)
    );
  }

  if (!existing) {
    throw new Error(`Inventory item ${id} not found`);
  }

  const current = payload.currentStock !== undefined ? payload.currentStock : existing.currentStock;
  const safety = payload.safetyStock !== undefined ? payload.safetyStock : existing.safetyStock;
  const reorder = payload.reorderPoint !== undefined ? payload.reorderPoint : existing.reorderPoint;
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
    daysOfSupply: Math.round((current / Math.max(existing.forecastDemand || 50, 1)) * 30),
    lastUpdated: new Date().toISOString().slice(0, 10),
  };

  const keyPart = updated.part.toLowerCase().trim();
  activeInventory = [
    updated,
    ...activeInventory.filter((i) => String(i.id) !== String(id) && i.part.toLowerCase().trim() !== keyPart),
  ];
  saveStoredInventory(activeInventory);

  if (ENDPOINTS.base) {
    const numId = Number(id);
    if (!isNaN(numId)) {
      (async () => {
        try {
          const body: any = {};
          if (payload.currentStock !== undefined) {
            body.current_stock = current;
            body.quantity = current;
          }
          if (payload.reorderPoint !== undefined) body.reorder_point = reorder;
          if (payload.safetyStock !== undefined) body.safety_stock = safety;
          if (Object.keys(body).length > 0) {
            await apiClient.put<any>(`${ENDPOINTS.base}/inventory/${numId}`, body);
          }
        } catch (err: any) {
          console.debug("API call to update inventory deferred:", err?.message || err);
        }
      })();
    }
  }

  return simulateLatency(updated, 20);
}

export async function adjustInventoryQuantity(id: string, delta: number, partName?: string): Promise<InventoryItem> {
  const cleanPartName = (partName || "").toLowerCase().trim();

  let item = activeInventory.find(
    (i) => String(i.id) === String(id) || (cleanPartName && i.part.toLowerCase().trim() === cleanPartName)
  );

  if (!item) {
    item = cachedRemoteItems.find(
      (i) => String(i.id) === String(id) || (cleanPartName && i.part.toLowerCase().trim() === cleanPartName)
    );
  }

  if (!item) {
    const currentInv = loadStoredInventory();
    item = currentInv.find(
      (i) => String(i.id) === String(id) || (cleanPartName && i.part.toLowerCase().trim() === cleanPartName)
    );
  }

  if (!item) {
    item = DEFAULT_KSRTC_PARTS.find(
      (i) => String(i.id) === String(id) || (cleanPartName && i.part.toLowerCase().trim() === cleanPartName)
    );
  }

  if (item) {
    const newQty = Math.max(0, (item.currentStock ?? 0) + delta);

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
        } catch (err: any) {
          console.debug("Could not post inventory transaction adjustment to server:", err?.message || err);
        }
      })();
    }

    return updateInventoryItem(item.id, { currentStock: newQty, part: item.part });
  }

  throw new Error(`Inventory item ${id} not found`);
}

export async function receiveItemStockIntoInventory(
  partName: string,
  quantityReceived: number,
  category?: string
): Promise<InventoryItem> {
  const qty = Number(quantityReceived) || 0;
  if (qty <= 0) {
    return {} as any;
  }

  // 1. Get comprehensive active inventory list
  const allItems = await getInventory();

  // 2. Intelligent multi-strategy matching
  let targetItem = findMatchingInventoryItem(allItems, partName);

  if (targetItem) {
    const prevStock = Number(targetItem.currentStock) || 0;
    const newStock = prevStock + qty;

    const updated = await adjustInventoryQuantity(targetItem.id, qty, targetItem.part);

    // Keep active inventory synchronized
    const cleanPo = partName.toLowerCase().trim();
    const cleanTarget = targetItem.part.toLowerCase().trim();
    if (cleanPo !== cleanTarget) {
      activeInventory = [
        { ...updated, part: targetItem.part },
        ...activeInventory.filter((i) => String(i.id) !== String(updated.id) && i.part.toLowerCase().trim() !== cleanTarget),
      ];
      saveStoredInventory(activeInventory);
    }

    // Broadcast inventory updated event so UI components refresh seamlessly
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ksrtc_inventory_changed", {
          detail: { part: targetItem.part, delta: qty, newStock, poPart: partName },
        })
      );
    }

    return updated;
  } else {
    // 3. New part: auto-register in inventory with received stock
    const cleanName = partName.trim();
    const safety = Math.max(10, Math.round(qty * 0.3));
    const reorder = Math.max(20, Math.round(qty * 0.6));
    const newItem = await addInventoryItem({
      part: cleanName,
      category: category || "General Commercial Parts",
      currentStock: qty,
      safetyStock: safety,
      reorderPoint: reorder,
      notes: `Auto-registered from Received Purchase Order (${qty} units initial stock)`,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ksrtc_inventory_changed", {
          detail: { part: cleanName, delta: qty, newStock: qty, poPart: partName },
        })
      );
    }

    return newItem;
  }
}

export async function getConsumptionHistory(partId: string): Promise<ConsumptionRecord[]> {
  const cleanId = (partId || "").toLowerCase().trim();
  const item = activeInventory.find(
    (i) => i.id.toLowerCase() === cleanId || i.part.toLowerCase() === cleanId
  );

  const months = ["Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026"];
  const baseDemand = item?.forecastDemand || (item?.reorderPoint ? Math.round(item.reorderPoint * 1.3) : 45);

  // Deterministic seed variance based on part id string
  const seed = (partId || "inv").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const variance = [0.94, 1.06, 0.98, 1.14, 0.89, 1.04];

  const records: ConsumptionRecord[] = months.map((period, idx) => {
    const factor = variance[(seed + idx) % variance.length];
    return {
      period,
      quantity: Math.max(5, Math.round(baseDemand * factor)),
    };
  });

  return simulateLatency(records, 25);
}

export async function getPriceHistory(partIdOrName: string): Promise<PriceRecord[]> {
  const cleanKey = (partIdOrName || "").toLowerCase().trim();
  const records: PriceRecord[] = [];

  // 1. Inspect locally created purchase orders in storage
  try {
    const rawCreated = localStorage.getItem("ksrtc_created_purchase_orders");
    if (rawCreated) {
      const pos: any[] = JSON.parse(rawCreated);
      for (const po of pos) {
        if (!po.lines) continue;
        const matchesSupplier = (po.supplier || "").toLowerCase().includes(cleanKey);
        for (const l of po.lines) {
          const matchesPart = (l.part || "").toLowerCase().includes(cleanKey);
          if (matchesPart || matchesSupplier) {
            records.push({
              date: po.poDate || new Date().toISOString().slice(0, 10),
              unitPrice: Number(l.unitPrice) || 0,
              supplier: po.supplier || "KSRTC Central Stores",
            });
          }
        }
      }
    }
  } catch {}

  // 2. Also check active inventory item for baseline unit cost if no PO records found
  const item = activeInventory.find(
    (i) => i.id.toLowerCase() === cleanKey || i.part.toLowerCase() === cleanKey
  );

  if (records.length === 0 && item && typeof item.unitCost === "number" && item.unitCost > 0) {
    const cost = item.unitCost;
    const sup = item.primarySupplier || "KSRTC Central Stores";
    records.push(
      { date: "2026-04-12", unitPrice: Math.round(cost * 0.96 * 100) / 100, supplier: sup },
      { date: "2026-06-20", unitPrice: Math.round(cost * 0.98 * 100) / 100, supplier: sup },
      { date: "2026-08-15", unitPrice: Math.round(cost * 1.00 * 100) / 100, supplier: sup },
      { date: "2026-09-02", unitPrice: Math.round(cost * 1.03 * 100) / 100, supplier: sup }
    );
  }

  return simulateLatency(records, 25);
}
