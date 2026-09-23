import { apiClient, DEMO_MODE, ENDPOINTS, simulateLatency } from "./apiClient";
import type { Supplier } from "../types";

const SUPPLIER_STORAGE_KEY = "ksrtc_suppliers_clean_v1";

// Unconditionally wipe legacy dummy keys from storage
try {
  localStorage.removeItem("ksrtc_suppliers_data");
  localStorage.removeItem("ksrtc_suppliers_v1");
  localStorage.removeItem("ksrtc_suppliers_v2");
} catch {
  // Ignore localStorage access issues
}

const DUMMY_SUPPLIERS = ["southern bus", "tvs mobility", "kerala auto"];

function loadStoredSuppliers(): Supplier[] {
  try {
    const raw = localStorage.getItem(SUPPLIER_STORAGE_KEY);
    if (!raw) return [];
    const parsed: Supplier[] = JSON.parse(raw);
    return parsed.filter(
      (s) => !DUMMY_SUPPLIERS.some((d) => s.name.toLowerCase().includes(d))
    );
  } catch {
    return [];
  }
}

let activeSuppliers: Supplier[] = loadStoredSuppliers();

export async function getSuppliers(): Promise<Supplier[]> {
  if (DEMO_MODE || !ENDPOINTS.base) {
    return simulateLatency(activeSuppliers, 300);
  }
  return apiClient.get<Supplier[]>(`${ENDPOINTS.base}/suppliers`);
}
