import { apiClient, ENDPOINTS, simulateLatency } from "./apiClient";
import type { Supplier } from "../types";

const SUPPLIER_STORAGE_KEY = "ksrtc_suppliers_clean_v2";

// Wipe legacy dummy keys from storage
try {
  localStorage.removeItem("ksrtc_suppliers_data");
  localStorage.removeItem("ksrtc_suppliers_v1");
  localStorage.removeItem("ksrtc_suppliers_v2");
} catch {
  // Ignore localStorage access issues
}

const DUMMY_SUPPLIERS = ["southern bus", "tvs mobility", "kerala auto"];

export const DEFAULT_KSRTC_SUPPLIERS: Supplier[] = [
  {
    id: "supp-1",
    name: "Sree Tyre House Ltd",
    category: "Tyres & Tubes",
    address: "Door No. 14/220, Industrial Development Area, Kochuveli, Thiruvananthapuram, Kerala - 695021",
    contactName: "S. Balakrishnan",
    contactEmail: "orders@sreetyres.com",
    contactPhone: "+91 471 2501432",
    reliabilityScore: 95,
    onTimeDeliveryRate: 94,
    avgLeadTimeDays: 5,
    openOrders: 3,
  },
  {
    id: "supp-2",
    name: "Global Auto Industries & Co",
    category: "Suspension & Chassis",
    address: "Plot 88, Major Industrial Estate, South Kalamassery, Ernakulam, Kerala - 683109",
    contactName: "R. Narayanan",
    contactEmail: "sales@globalautoind.co.in",
    contactPhone: "+91 484 2556781",
    reliabilityScore: 92,
    onTimeDeliveryRate: 91,
    avgLeadTimeDays: 7,
    openOrders: 2,
  },
  {
    id: "supp-3",
    name: "Balaji Tyre House & Co",
    category: "Tyres & Retreading",
    address: "Building 5A, SIDCO Industrial Park, Olavakkode, Palakkad, Kerala - 678002",
    contactName: "K. Mohan Kumar",
    contactEmail: "contact@balajityre.com",
    contactPhone: "+91 491 2534890",
    reliabilityScore: 90,
    onTimeDeliveryRate: 89,
    avgLeadTimeDays: 6,
    openOrders: 1,
  },
  {
    id: "supp-4",
    name: "Sree Fasteners & Tools Ltd",
    category: "Hardware & Fasteners",
    address: "Plot 32, Kinfra Small Industries Park, Koratty, Thrissur, Kerala - 680308",
    contactName: "Anand Raj",
    contactEmail: "supplies@sreefasteners.in",
    contactPhone: "+91 480 2734120",
    reliabilityScore: 96,
    onTimeDeliveryRate: 98,
    avgLeadTimeDays: 4,
    openOrders: 2,
  },
  {
    id: "supp-5",
    name: "Royal Lubricant Distributors & Co",
    category: "Oils, Lubricants & Greases",
    address: "NH 66 Bypass Road, Kazhakkoottam, Thiruvananthapuram, Kerala - 695582",
    contactName: "George Mathew",
    contactEmail: "sales@royallubricants.net",
    contactPhone: "+91 471 2419088",
    reliabilityScore: 94,
    onTimeDeliveryRate: 95,
    avgLeadTimeDays: 4,
    openOrders: 2,
  },
  {
    id: "supp-6",
    name: "Metro Auto Distributors & Co",
    category: "Electrical Components & Sensors",
    address: "22/104A, M.G. Road, Ravipuram, Kochi, Kerala - 682016",
    contactName: "V. Harish",
    contactEmail: "metroauto.kochi@gmail.com",
    contactPhone: "+91 484 2367411",
    reliabilityScore: 91,
    onTimeDeliveryRate: 90,
    avgLeadTimeDays: 6,
    openOrders: 2,
  },
  {
    id: "supp-7",
    name: "Kerala Lubricant Distributors & Co",
    category: "Lubricants & Engine Fluids",
    address: "Aroor Industrial Zone, Alappuzha District, Kerala - 688534",
    contactName: "M. Nizar",
    contactEmail: "keralalubes@asianetindia.com",
    contactPhone: "+91 478 2872390",
    reliabilityScore: 93,
    onTimeDeliveryRate: 92,
    avgLeadTimeDays: 5,
    openOrders: 1,
  },
  {
    id: "supp-8",
    name: "Kerala Bearings & Traders",
    category: "Bearings & Transmission",
    address: "Mullassery Canal Road, Ernakulam City, Kochi, Kerala - 682011",
    contactName: "Praveen Varma",
    contactEmail: "info@keralabearings.in",
    contactPhone: "+91 484 2381200",
    reliabilityScore: 97,
    onTimeDeliveryRate: 96,
    avgLeadTimeDays: 4,
    openOrders: 3,
  },
  {
    id: "supp-9",
    name: "Sunrise Enterprises & Co",
    category: "Air Brake & Pneumatics",
    address: "Phase II, IDA Edayar, Muppathadam P.O., Aluva, Ernakulam, Kerala - 683110",
    contactName: "Thomas Varghese",
    contactEmail: "sunrise.edayar@gmail.com",
    contactPhone: "+91 484 2601955",
    reliabilityScore: 92,
    onTimeDeliveryRate: 93,
    avgLeadTimeDays: 7,
    openOrders: 1,
  },
  {
    id: "supp-10",
    name: "Reliable Tyre House & Co",
    category: "Tyres & Retread Rubber",
    address: "Kallai Road, Kozhikode, Kerala - 673002",
    contactName: "Abdullah K.",
    contactEmail: "reliabletyre.clt@gmail.com",
    contactPhone: "+91 495 2304911",
    reliabilityScore: 93,
    onTimeDeliveryRate: 91,
    avgLeadTimeDays: 6,
    openOrders: 1,
  },
  {
    id: "supp-11",
    name: "Cochin Auto Agencies & Co",
    category: "Engine & Clutch Components",
    address: "Paramara Road, Ernakulam North, Kochi, Kerala - 682018",
    contactName: "K. R. Menon",
    contactEmail: "orders@cochinautoagencies.com",
    contactPhone: "+91 484 2390842",
    reliabilityScore: 95,
    onTimeDeliveryRate: 96,
    avgLeadTimeDays: 5,
    openOrders: 2,
  },
  {
    id: "supp-12",
    name: "Metro Auto Components Pvt Ltd",
    category: "Braking & Steering",
    address: "Plot 19, Development Plot, Poovanthuruthu, Kottayam, Kerala - 686012",
    contactName: "Philip John",
    contactEmail: "metrocomponents@ktm.co.in",
    contactPhone: "+91 481 2341255",
    reliabilityScore: 91,
    onTimeDeliveryRate: 90,
    avgLeadTimeDays: 7,
    openOrders: 1,
  },
  {
    id: "supp-13",
    name: "Southern Motor Parts Pvt Ltd",
    category: "Propeller Shaft & Axles",
    address: "Chalai Bazaar, Thiruvananthapuram, Kerala - 695036",
    contactName: "G. Shankaran",
    contactEmail: "southernmotorparts@gmail.com",
    contactPhone: "+91 471 2471920",
    reliabilityScore: 94,
    onTimeDeliveryRate: 95,
    avgLeadTimeDays: 5,
    openOrders: 2,
  },
  {
    id: "supp-14",
    name: "United Electricals Ltd",
    category: "Alternators, Starters & Batteries",
    address: "Palayamkottai Road, Thiruvananthapuram / Kollam Bypass, Kerala - 691004",
    contactName: "C. Unnikrishnan",
    contactEmail: "sales@unitedelectricals.gov.in",
    contactPhone: "+91 474 2741911",
    reliabilityScore: 96,
    onTimeDeliveryRate: 94,
    avgLeadTimeDays: 6,
    openOrders: 2,
  },
  {
    id: "supp-15",
    name: "Trivandrum Tyre House Enterprises",
    category: "Heavy Commercial Radial Tyres",
    address: "Near KSRTC Central Depot, Thampanoor, Thiruvananthapuram, Kerala - 695001",
    contactName: "B. Jayakumar",
    contactEmail: "tvmtyrehouse@yahoo.co.in",
    contactPhone: "+91 471 2320499",
    reliabilityScore: 92,
    onTimeDeliveryRate: 93,
    avgLeadTimeDays: 5,
    openOrders: 1,
  },
  {
    id: "supp-16",
    name: "KSRTC Central Stores & Workshop",
    category: "In-House Central Stores & Spares",
    address: "KSRTC Central Works & Directorate, Pappanamcode, Thiruvananthapuram, Kerala - 695018",
    contactName: "Chief Materials Manager, KSRTC",
    contactEmail: "central.stores@ksrtc.kerala.gov.in",
    contactPhone: "+91 471 2463799",
    reliabilityScore: 98,
    onTimeDeliveryRate: 99,
    avgLeadTimeDays: 3,
    openOrders: 5,
  },
  {
    id: "supp-17",
    name: "Lucas TVS Auto Components",
    category: "Electrical & Fuel Injection",
    address: "Padi, Chennai / Cochin Regional Depot, Kalamassery, Kerala - 683104",
    contactName: "K. Swaminathan",
    contactEmail: "fleet.sales@lucastvs.co.in",
    contactPhone: "+91 44 26257273",
    reliabilityScore: 97,
    onTimeDeliveryRate: 96,
    avgLeadTimeDays: 5,
    openOrders: 2,
  },
  {
    id: "supp-18",
    name: "Ashok Leyland OEM Spares Division",
    category: "OEM Bus Chassis & Powertrain",
    address: "No. 1, Sardar Patel Road, Guindy / Kochi Zonal Office, NH Bypass, Kundannoor, Kerala - 682304",
    contactName: "Zonal Service Head",
    contactEmail: "ksrtc.spares@ashokleyland.com",
    contactPhone: "+91 484 2389100",
    reliabilityScore: 98,
    onTimeDeliveryRate: 97,
    avgLeadTimeDays: 5,
    openOrders: 4,
  },
  {
    id: "supp-19",
    name: "Tata Motors Commercial Fleet Spares",
    category: "OEM Engine, Transmission & Suspension",
    address: "Tata Motors Zonal Spares Depot, Seaport-Airport Road, Kakkanad, Kochi, Kerala - 682030",
    contactName: "Govt Fleet Manager",
    contactEmail: "kerala.fleet@tatamotors.com",
    contactPhone: "+91 484 2428900",
    reliabilityScore: 97,
    onTimeDeliveryRate: 96,
    avgLeadTimeDays: 5,
    openOrders: 3,
  },
  {
    id: "supp-20",
    name: "Bosch Automotive Aftermarket",
    category: "Fuel Injection, Filters & Sensors",
    address: "Bosch Regional Distribution Centre, Willingdon Island, Kochi, Kerala - 682003",
    contactName: "Fleet Support Lead",
    contactEmail: "aftermarket.india@in.bosch.com",
    contactPhone: "+91 484 2668100",
    reliabilityScore: 99,
    onTimeDeliveryRate: 98,
    avgLeadTimeDays: 4,
    openOrders: 2,
  },
  {
    id: "supp-21",
    name: "Subros Thermal Solutions Ltd",
    category: "HVAC, Climate Control & AC Compressors",
    address: "Plot 42, Electronics & Heavy Auto Cluster, South Kalamassery, Ernakulam, Kerala - 683104",
    contactName: "S. K. Raman (OEM Operations)",
    contactEmail: "oem.sales@subros.co.in",
    contactPhone: "+91 484 2549811",
    reliabilityScore: 97,
    onTimeDeliveryRate: 96,
    avgLeadTimeDays: 5,
    openOrders: 1,
  },
];

function normalizeSupplier(s: any, idx = 0): Supplier {
  // Find matching default address if not provided
  const matchedDefault = DEFAULT_KSRTC_SUPPLIERS.find(
    (d) => d.name.toLowerCase().trim() === (s.name || "").toLowerCase().trim()
  );

  return {
    id: String(s.id ?? `supp-${idx}`),
    name: s.name || matchedDefault?.name || "KSRTC Central Stores",
    category: s.category || matchedDefault?.category || "General Commercial Parts",
    address: s.address || matchedDefault?.address || "Industrial Area, Kerala",
    contactName: s.contactName || s.contact_name || matchedDefault?.contactName || "Materials & Stores Manager",
    contactEmail: s.contactEmail || s.email || matchedDefault?.contactEmail || "central.stores@ksrtc.kerala.gov.in",
    contactPhone: s.contactPhone || s.phone || matchedDefault?.contactPhone || "+91 471 2463799",
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
        for (const s of DEFAULT_KSRTC_SUPPLIERS) map.set(s.name.toLowerCase(), s);
        for (const s of normalized) map.set(s.name.toLowerCase(), s);
        for (const s of activeSuppliers) map.set(s.name.toLowerCase(), s);
        
        const merged = Array.from(map.values());
        saveStoredSuppliers(merged);
        activeSuppliers = merged;
        return simulateLatency(merged, 10);
      }
    } catch (err) {
      console.warn("API call to /suppliers failed, using cached suppliers:", err);
    }
  }

  // Fallback defaults merged with local stored
  const map = new Map<string, Supplier>();
  for (const s of DEFAULT_KSRTC_SUPPLIERS) map.set(s.name.toLowerCase(), s);
  for (const s of activeSuppliers) map.set(s.name.toLowerCase(), s);
  const merged = Array.from(map.values());
  saveStoredSuppliers(merged);
  activeSuppliers = merged;

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
