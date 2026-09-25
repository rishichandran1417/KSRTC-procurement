import { apiClient, ENDPOINTS, simulateLatency } from "./apiClient";
import type { Supplier } from "../types";

const SUPPLIER_STORAGE_KEY = "ksrtc_suppliers_clean_v1";

// Wipe legacy dummy keys from storage
try {
  localStorage.removeItem("ksrtc_suppliers_data");
  localStorage.removeItem("ksrtc_suppliers_v1");
  localStorage.removeItem("ksrtc_suppliers_v2");
} catch {
  // Ignore localStorage access issues
}

const DUMMY_SUPPLIERS = ["southern bus", "tvs mobility", "kerala auto"];

function normalizeSupplier(s: any, idx = 0): Supplier {
  return {
    id: String(s.id ?? `supp-${idx}`),
    name: s.name || "KSRTC Central Stores",
    category: s.category || "General Commercial Parts",
    contactName: s.contactName || s.contact_name || "Materials & Stores Manager",
    contactEmail: s.contactEmail || s.email || "central.stores@ksrtc.kerala.gov.in",
    contactPhone: s.contactPhone || s.phone || "+91 471 2463799",
    reliabilityScore: typeof s.reliabilityScore === "number" ? s.reliabilityScore : (typeof s.reliability_score === "number" ? s.reliability_score : 92),
    onTimeDeliveryRate: typeof s.onTimeDeliveryRate === "number" ? s.onTimeDeliveryRate : (typeof s.on_time_delivery_rate === "number" ? s.on_time_delivery_rate : 95),
    avgLeadTimeDays: typeof s.avgLeadTimeDays === "number" ? s.avgLeadTimeDays : (typeof s.lead_time_days === "number" ? s.lead_time_days : 7),
    openOrders: typeof s.openOrders === "number" ? s.openOrders : (typeof s.open_orders === "number" ? s.open_orders : 1),
  };
}

function loadStoredSuppliers(): Supplier[] {
  try {
    const raw = localStorage.getItem(SUPPLIER_STORAGE_KEY);
    if (!raw) return [];
    const parsed: any[] = JSON.parse(raw);
    return parsed
      .filter((s) => !DUMMY_SUPPLIERS.some((d) => (s.name || "").toLowerCase().includes(d)))
      .map((s, i) => normalizeSupplier(s, i));
  } catch {
    return [];
  }
}

function saveStoredSuppliers(suppliers: Supplier[]): void {
  try {
    localStorage.setItem(SUPPLIER_STORAGE_KEY, JSON.stringify(suppliers));
  } catch {}
}

let activeSuppliers: Supplier[] = loadStoredSuppliers();

export async function getSuppliers(): Promise<Supplier[]> {
  activeSuppliers = loadStoredSuppliers();

  if (ENDPOINTS.base) {
    try {
      const remote = await apiClient.get<any[]>(`${ENDPOINTS.base}/suppliers`);
      if (Array.isArray(remote) && remote.length > 0) {
        const normalized = remote.map((s, i) => normalizeSupplier(s, i));
        
        // Merge with local changes
        const map = new Map<string, Supplier>();
        for (const s of normalized) map.set(s.id, s);
        for (const s of activeSuppliers) map.set(s.id, s);
        
        const merged = Array.from(map.values());
        saveStoredSuppliers(merged);
        activeSuppliers = merged;
        return simulateLatency(merged, 10);
      }
    } catch (err) {
      console.warn("API call to /suppliers failed, using cached suppliers:", err);
    }
  }

  // Fallback defaults if no suppliers yet
  if (activeSuppliers.length === 0) {
    activeSuppliers = [
      normalizeSupplier({
        id: "1",
        name: "KSRTC Central Stores & Workshop",
        category: "General Fleet Spares",
        contactName: "Chief Materials Officer",
        email: "central.stores@ksrtc.kerala.gov.in",
        phone: "+91 471 2463799",
        reliabilityScore: 94,
        onTimeDeliveryRate: 96,
        avgLeadTimeDays: 7,
        openOrders: 1,
      }),
    ];
    saveStoredSuppliers(activeSuppliers);
  }

  return simulateLatency([...activeSuppliers], 50);
}

export async function updateSupplier(updated: Supplier): Promise<Supplier> {
  activeSuppliers = loadStoredSuppliers();
  const normalized = normalizeSupplier(updated);
  activeSuppliers = [normalized, ...activeSuppliers.filter((s) => s.id !== normalized.id && s.name.toLowerCase() !== normalized.name.toLowerCase())];
  saveStoredSuppliers(activeSuppliers);

  if (ENDPOINTS.base) {
    (async () => {
      try {
        await apiClient.put(`${ENDPOINTS.base}/suppliers/${normalized.id}`, normalized);
      } catch (err) {
        console.warn("Could not sync supplier update to server:", err);
      }
    })();
  }

  return simulateLatency(normalized, 10);
}
