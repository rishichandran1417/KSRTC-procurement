import { ENDPOINTS, apiClient, simulateLatency } from "./apiClient";
import { getInventory } from "./inventoryApi";
import { getPurchaseOrders } from "./purchaseOrderApi";
import type { DashboardKpis, GlobalFilters } from "../types";

export async function getDashboardKpis(_filters: GlobalFilters): Promise<DashboardKpis> {
  if (ENDPOINTS.base) {
    try {
      return await apiClient.post<DashboardKpis>(`${ENDPOINTS.base}/dashboard/kpis`, _filters);
    } catch {
      // If endpoint is not yet implemented on the backend, calculate dynamically from active data
    }
  }

  const inventory = await getInventory();
  const orders = await getPurchaseOrders();

  const forecastDemand = inventory.reduce((sum, i) => sum + i.forecastDemand, 0);
  const currentInventory = inventory.reduce((sum, i) => sum + i.currentStock, 0);
  const stockoutRiskCount = inventory.filter((i) => i.stockoutRisk !== "Low").length;
  const openPurchaseOrders = orders.filter(
    (po) => !["Received", "Closed", "Cancelled"].includes(po.status)
  ).length;

  const recommendedProcurement = inventory
    .filter((i) => i.currentStock < i.reorderPoint)
    .reduce((sum, i) => sum + (i.reorderPoint - i.currentStock) * (i.unitCost || 0), 0);
  const procurementBudget = orders.reduce((sum, o) => sum + o.total, 0);

  return simulateLatency(
    {
      forecastDemand,
      currentInventory,
      stockoutRiskCount,
      openPurchaseOrders,
      procurementBudget,
      recommendedProcurement,
    },
    200
  );
}
