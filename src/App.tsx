import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { FiltersProvider } from "./state/FiltersContext";
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

export default function App() {
  return (
    <FiltersProvider>
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
    </FiltersProvider>
  );
}
