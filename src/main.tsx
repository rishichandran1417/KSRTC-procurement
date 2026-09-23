import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

try {
  localStorage.removeItem("ksrtc_inventory_data");
  localStorage.removeItem("ksrtc_purchase_orders_data");
  localStorage.removeItem("ksrtc_suppliers_data");
  localStorage.removeItem("ksrtc_chat_sessions_v1");
} catch {}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
