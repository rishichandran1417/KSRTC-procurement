import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { FiltersProvider } from "./state/FiltersContext";
import { SidebarProvider } from "./state/SidebarContext";
import { AlertsProvider } from "./state/AlertsContext";
import Dashboard from "./pages/Dashboard";
import Forecast from "./pages/Forecast";
import Procurement from "./pages/Procurement";
import Inventory from "./pages/Inventory";
import PurchaseOrders from "./pages/PurchaseOrders";
import NewPurchaseOrder from "./pages/NewPurchaseOrder";
import Suppliers from "./pages/Suppliers";
import Analytics from "./pages/Analytics";
import AiAssistant from "./pages/AiAssistant";
import Settings from "./pages/Settings";

// Clear any dummy/seeded data from previous runs
try {
  const DUMMY_CLEARED_KEY = "ksrtc_dummy_purged_v3";
  if (!localStorage.getItem(DUMMY_CLEARED_KEY)) {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("ksrtc_") && key !== DUMMY_CLEARED_KEY) {
        localStorage.removeItem(key);
      }
    });
    localStorage.setItem(DUMMY_CLEARED_KEY, "true");
  }
} catch {
  // Ignore localStorage access issues
}

export default function App() {
  return (
    <FiltersProvider>
      <SidebarProvider>
        <AlertsProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/forecast" element={<Forecast />} />
                <Route path="/procurement" element={<Procurement />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/purchase-orders/new" element={<NewPurchaseOrder />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/ai-assistant" element={<AiAssistant />} />
                <Route path="/settings/integrations" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AlertsProvider>
      </SidebarProvider>
    </FiltersProvider>
  );
}
