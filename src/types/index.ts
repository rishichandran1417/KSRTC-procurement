// ---------- Shared / filter types ----------

export type Horizon = 1 | 3 | 6 | 9 | 12;

export interface GlobalFilters {
  category: string;
  startDate: string;
  endDate: string;
  horizon: Horizon;
}

export interface ConnectionStatus {
  connected: boolean;
  lastChecked?: string;
  message?: string;
}

// ---------- Dashboard ----------

export interface DashboardKpis {
  forecastDemand: number;
  currentInventory: number;
  stockoutRiskCount: number;
  openPurchaseOrders: number;
  procurementBudget: number;
  recommendedProcurement: number;
}

// ---------- Forecasting ----------

export interface ForecastRequest {
  depot?: string;
  part: string;
  start_date: string;
  end_date: string;
  horizon: Horizon;
}

export interface ForecastPoint {
  period: string; // e.g. "2026-01"
  actual?: number;
  forecast?: number;
  lowerBound?: number;
  upperBound?: number;
}

export interface ForecastResult {
  modelName: string;
  mae: number;
  rmse: number;
  mape: number;
  bias: number;
  horizon: Horizon;
  series: ForecastPoint[];
}

// ---------- Procurement / PuLP ----------

export interface ProcurementRequest {
  budget: number;
  depot?: string;
  forecast_horizon: Horizon;
  service_level: number;
}

export type Priority = "High" | "Medium" | "Low";

export interface ProcurementItem {
  part: string;
  quantity: number;
  unit_price: number;
  total_cost: number;
  supplier: string;
  priority: Priority;
}

export interface ProcurementResult {
  budget: number;
  recommended_spend: number;
  remaining_budget: number;
  items: ProcurementItem[];
}

// ---------- Inventory ----------

export type StockStatus = "Healthy" | "Warning" | "Critical";

export interface InventoryItem {
  id: string;
  part: string;
  depot: string;
  category: string;
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  forecastDemand: number;
  daysOfSupply: number;
  stockoutRisk: "Low" | "Medium" | "High";
  status: StockStatus;
  lastUpdated: string;
  unitCost?: number;
  primarySupplier?: string;
  notes?: string;
}

export interface AddInventoryPayload {
  part: string;
  category: string;
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  unitCost?: number;
  primarySupplier?: string;
  depot?: string;
  notes?: string;
}

export interface UpdateInventoryPayload {
  part?: string;
  category?: string;
  currentStock?: number;
  safetyStock?: number;
  reorderPoint?: number;
  unitCost?: number;
  primarySupplier?: string;
  notes?: string;
}

export interface ConsumptionRecord {
  period: string;
  quantity: number;
}

export interface PriceRecord {
  date: string;
  unitPrice: number;
  supplier: string;
}

// ---------- Purchase Orders ----------

export type PoStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Ordered"
  | "Partially Received"
  | "Received"
  | "Delayed"
  | "Closed"
  | "Cancelled";

export interface PurchaseOrderLine {
  part: string;
  category?: string;
  quantity: number; // Ordered Quantity
  unitPrice: number;
  totalCost: number;
  receivedQuantity?: number; // Previously Accepted Quantity
  rejectedQuantity?: number; // Previously Rejected Quantity
}

export type InstallmentStatus = "Scheduled" | "Partially Received" | "Fully Received" | "Delayed";

export interface DeliveryInstallment {
  id: string;
  installmentNumber: number; // e.g., 1, 2, 3
  expectedDate: string; // e.g. "2026-10-05"
  quantity: number; // Scheduled Qty (e.g. 50, 25, 25)
  receivedQuantity?: number; // Quantity received for this installment
  status?: InstallmentStatus;
  notes?: string; // e.g. "Initial shipment of 50 units", "2nd tranche of 25 units"
}

export interface PurchaseOrder {
  id?: number | string;
  poNumber: string;
  supplier: string;
  supplierAddress?: string;
  depot: string;
  poDate: string;
  expectedDelivery: string;
  total: number;
  status: PoStatus;
  lines: PurchaseOrderLine[];
  notes?: string;
  deliverySchedule?: DeliveryInstallment[];
  createdAt?: number;
  isNew?: boolean;
  inventoryReceived?: boolean;
  hasRejections?: boolean;
  totalRejectedUnits?: number;
  isRescheduled?: boolean;
  rescheduleCount?: number;
}

// ---------- Goods Receipts ----------

export type RejectionReason =
  | "Damaged"
  | "Wrong Specification"
  | "Wrong Item"
  | "Quantity Discrepancy"
  | "Quality Failure"
  | "Other";

export interface GoodsReceiptItem {
  part: string;
  category?: string;
  orderedQuantity: number;
  previouslyReceived: number;
  pendingQuantity: number;
  acceptedQuantity: number; // Receive Now
  rejectedQuantity: number;
  rejectionReason?: RejectionReason | string;
  customRejectionReason?: string;
  remarks?: string;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  poNumber: string;
  receiptDate: string;
  receivedBy: string;
  remarks?: string;
  items: GoodsReceiptItem[];
  createdAt: string;
}

// ---------- Delivery Rescheduling ----------

export interface PoDeliveryReschedule {
  id: string;
  poNumber: string;
  previousDate: string;
  newDate: string;
  reason: string;
  changedBy: string;
  changedAt: string;
  remarks?: string;
}

// ---------- Audit Trail ----------

export type PoAuditAction =
  | "PO Created"
  | "PO Submitted"
  | "PO Approved"
  | "PO Ordered"
  | "PO Submitted/Ordered"
  | "PO Edited"
  | "Delivery Date Changed"
  | "Goods Receipt Created"
  | "Goods Received"
  | "Partial Receipt"
  | "Full Receipt"
  | "Rejected Quantity Recorded"
  | "PO Status Updated"
  | "PO Received"
  | "PO Cancelled"
  | "PO Closed";

export interface PoAuditLog {
  id: string;
  poNumber: string;
  action: PoAuditAction;
  performedBy: string;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  remarks?: string;
  details?: string;
}


// ---------- Suppliers ----------

export interface Supplier {
  id: string;
  name: string;
  category: string;
  reliabilityScore: number; // 0-100
  onTimeDeliveryRate: number; // 0-100
  openOrders: number;
  avgLeadTimeDays: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

// ---------- Power BI ----------

export interface PowerBIConfig {
  embedUrl: string;
  accessToken?: string;
  reportId?: string;
}

// ---------- Gemini AI Assistant ----------

export type ChatResponseType =
  | "text"
  | "forecast"
  | "procurement"
  | "inventory"
  | "purchase_orders"
  | "price_analysis";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  type: ChatResponseType;
  text: string;
  payload?: ForecastResult | ProcurementResult | InventoryItem[] | PurchaseOrder[] | PriceRecord[];
}

// ---------- Integration settings ----------

export interface IntegrationEndpoints {
  forecastApiUrl: string;
  optimizationApiUrl: string;
  powerbiEmbedUrl: string;
  chatApiUrl: string;
  databaseUrl: string;
}
