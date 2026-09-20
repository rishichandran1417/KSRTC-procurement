import type { ProcurementRequest, ProcurementResult, ProcurementItem } from "../types";
import { MOCK_INVENTORY } from "./inventory";

export function mockProcurement(req: ProcurementRequest): ProcurementResult {
  const items: ProcurementItem[] = [];
  let spend = 0;
  const targetSpend = req.budget * 0.95;

  // Use active inventory items if available
  const activeItems = MOCK_INVENTORY.length > 0 ? MOCK_INVENTORY : [];

  for (const inv of activeItems) {
    if (spend >= targetSpend) break;
    const unitPrice = 500; // estimated default price
    const qty = Math.max(0, inv.reorderPoint - inv.currentStock);
    if (qty <= 0) continue;
    const total = qty * unitPrice;
    if (spend + total > req.budget) continue;

    items.push({
      part: inv.part,
      unit_price: unitPrice,
      supplier: "Direct Supplier",
      priority: inv.status === "Critical" ? "High" : "Medium",
      quantity: qty,
      total_cost: total,
    });
    spend += total;
  }

  return {
    budget: req.budget,
    recommended_spend: Math.round(spend),
    remaining_budget: Math.round(req.budget - spend),
    items,
  };
}
