import type { InventoryItem, ConsumptionRecord, PriceRecord } from "../types";

export const SINGLE_DEPOT = "KSRTC Central Depot, Thiruvananthapuram";
export const CATEGORIES = ["Tyres", "Brake Parts", "Filters", "Bearings", "Electricals", "Fluids"];

export const INITIAL_PARTS: string[] = [];

export const MOCK_INVENTORY: InventoryItem[] = [];

export function mockConsumptionHistory(): ConsumptionRecord[] {
  return [];
}

export function mockPriceHistory(_partName: string = ""): PriceRecord[] {
  return [];
}
