import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getInventory } from "../services/inventoryApi";
import type { InventoryItem } from "../types";

interface AlertsContextValue {
  lowStockItems: InventoryItem[];
  criticalItems: InventoryItem[];
  warningItems: InventoryItem[];
  totalAlerts: number;
  isAlertModalOpen: boolean;
  openAlertModal: () => void;
  closeAlertModal: () => void;
  refreshAlerts: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [criticalItems, setCriticalItems] = useState<InventoryItem[]>([]);
  const [warningItems, setWarningItems] = useState<InventoryItem[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  const refreshAlerts = useCallback(async () => {
    try {
      const inv = await getInventory();
      const critical = inv.filter((i) => i.status === "Critical" || i.currentStock <= i.safetyStock);
      const warning = inv.filter(
        (i) => i.status === "Warning" || (i.currentStock <= i.reorderPoint && i.currentStock > i.safetyStock)
      );
      const combined = [...critical, ...warning];
      setCriticalItems(critical);
      setWarningItems(warning);
      setLowStockItems(combined);
    } catch {
      // Ignore background refresh errors
    }
  }, []);

  useEffect(() => {
    refreshAlerts();
    const interval = setInterval(refreshAlerts, 60000);
    return () => clearInterval(interval);
  }, [refreshAlerts]);

  return (
    <AlertsContext.Provider
      value={{
        lowStockItems,
        criticalItems,
        warningItems,
        totalAlerts: lowStockItems.length,
        isAlertModalOpen,
        openAlertModal: () => setIsAlertModalOpen(true),
        closeAlertModal: () => setIsAlertModalOpen(false),
        refreshAlerts,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) {
    throw new Error("useAlerts must be used within an AlertsProvider");
  }
  return ctx;
}
