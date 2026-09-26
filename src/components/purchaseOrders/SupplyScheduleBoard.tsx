import { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  Truck,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  PackageCheck,
  X,
  MapPin,
} from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";
import type { PurchaseOrder, PoStatus } from "../../types";

interface SupplyScheduleBoardProps {
  orders: PurchaseOrder[];
  onUpdateOrder: (updated: PurchaseOrder) => Promise<void> | void;
  onStatusChange: (poNumber: string, status: PoStatus) => Promise<void> | void;
  onViewPo: (po: PurchaseOrder) => void;
  onPdfPo: (po: PurchaseOrder) => void;
}

type ScheduleMode = "pipeline" | "calendar";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function getStartOfDay(d: Date): Date {
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
}

function getDaysDiff(targetDateStr: string): number | null {
  const target = parseDate(targetDateStr);
  if (!target) return null;
  const today = getStartOfDay(new Date());
  const targetDay = getStartOfDay(target);
  const diffMs = targetDay.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function getRelativeDateLabel(daysDiff: number | null): { text: string; color: string } {
  if (daysDiff === null) return { text: "No Date", color: "text-slate-400 bg-slate-100 dark:bg-zinc-800" };
  if (daysDiff < 0) {
    const days = Math.abs(daysDiff);
    return {
      text: `${days} day${days > 1 ? "s" : ""} overdue`,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 font-semibold",
    };
  }
  if (daysDiff === 0) {
    return {
      text: "Due Today",
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 font-bold animate-pulse",
    };
  }
  if (daysDiff === 1) {
    return {
      text: "Due Tomorrow",
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 font-medium",
    };
  }
  if (daysDiff <= 7) {
    return {
      text: `In ${daysDiff} days`,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60",
    };
  }
  return {
    text: `In ${daysDiff} days`,
    color: "text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700",
  };
}

export function SupplyScheduleBoard({
  orders,
  onUpdateOrder,
  onStatusChange,
  onViewPo,
  onPdfPo,
}: SupplyScheduleBoardProps) {
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("pipeline");
  const [search, setSearch] = useState("");
  const [depotFilter, setDepotFilter] = useState("All");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState<"All" | "overdue" | "week" | "received">("All");

  // Calendar month state
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());

  // Quick Reschedule Modal State
  const [reschedulingPo, setReschedulingPo] = useState<PurchaseOrder | null>(null);
  const [newDeliveryDate, setNewDeliveryDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isSavingReschedule, setIsSavingReschedule] = useState(false);

  // Distinct depots & suppliers
  const distinctDepots = useMemo(() => {
    const s = new Set<string>();
    orders.forEach((o) => {
      if (o.depot && o.depot.trim()) s.add(o.depot.trim());
    });
    return Array.from(s).sort();
  }, [orders]);

  const distinctSuppliers = useMemo(() => {
    const s = new Set<string>();
    orders.forEach((o) => {
      if (o.supplier && o.supplier.trim()) s.add(o.supplier.trim());
    });
    return Array.from(s).sort();
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (depotFilter !== "All" && o.depot !== depotFilter) return false;
      if (supplierFilter !== "All" && o.supplier !== supplierFilter) return false;

      const diff = getDaysDiff(o.expectedDelivery);
      const isReceived = o.status === "Received" || o.status === "Closed";

      if (urgencyFilter === "overdue") {
        if (isReceived || diff === null || diff >= 0) return false;
      } else if (urgencyFilter === "week") {
        if (isReceived || diff === null || diff < 0 || diff > 7) return false;
      } else if (urgencyFilter === "received") {
        if (!isReceived) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchPo = (o.poNumber || "").toLowerCase().includes(q);
        const matchSup = (o.supplier || "").toLowerCase().includes(q);
        const matchDep = (o.depot || "").toLowerCase().includes(q);
        const matchParts = o.lines?.some((l) => (l.part || "").toLowerCase().includes(q));
        if (!matchPo && !matchSup && !matchDep && !matchParts) return false;
      }

      return true;
    });
  }, [orders, depotFilter, supplierFilter, urgencyFilter, search]);

  // Overall KPIs
  const kpis = useMemo(() => {
    let overdueCount = 0;
    let dueThisWeekCount = 0;
    let totalScheduledValue = 0;
    let activePendingCount = 0;

    orders.forEach((o) => {
      const isComplete = o.status === "Received" || o.status === "Closed" || o.status === "Cancelled";
      if (!isComplete) {
        activePendingCount += 1;
        totalScheduledValue += o.total || 0;
        const diff = getDaysDiff(o.expectedDelivery);
        if (diff !== null && diff < 0) overdueCount += 1;
        if (diff !== null && diff >= 0 && diff <= 7) dueThisWeekCount += 1;
      }
    });

    return {
      overdueCount,
      dueThisWeekCount,
      totalScheduledValue,
      activePendingCount,
    };
  }, [orders]);

  // Pipeline categorization
  const pipelineBuckets = useMemo(() => {
    const overdue: PurchaseOrder[] = [];
    const dueToday: PurchaseOrder[] = [];
    const thisWeek: PurchaseOrder[] = [];
    const nextWeek: PurchaseOrder[] = [];
    const later: PurchaseOrder[] = [];
    const completed: PurchaseOrder[] = [];

    filteredOrders.forEach((o) => {
      if (o.status === "Received" || o.status === "Closed") {
        completed.push(o);
        return;
      }
      if (o.status === "Cancelled") {
        return;
      }

      const diff = getDaysDiff(o.expectedDelivery);
      if (diff === null) {
        later.push(o);
      } else if (diff < 0) {
        overdue.push(o);
      } else if (diff === 0) {
        dueToday.push(o);
      } else if (diff <= 7) {
        thisWeek.push(o);
      } else if (diff <= 14) {
        nextWeek.push(o);
      } else {
        later.push(o);
      }
    });

    const sortByDate = (list: PurchaseOrder[], asc = true) => {
      return [...list].sort((a, b) => {
        const da = new Date(a.expectedDelivery).getTime() || 0;
        const db = new Date(b.expectedDelivery).getTime() || 0;
        return asc ? da - db : db - da;
      });
    };

    return [
      {
        id: "overdue",
        title: "Overdue Attention",
        badge: "Critical",
        badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800",
        headerColor: "border-l-4 border-l-rose-500",
        items: sortByDate(overdue, true),
        icon: AlertTriangle,
      },
      {
        id: "dueToday",
        title: "Due Today",
        badge: "Today",
        badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800",
        headerColor: "border-l-4 border-l-amber-500",
        items: sortByDate(dueToday, true),
        icon: Clock,
      },
      {
        id: "thisWeek",
        title: "Inbound This Week",
        badge: "Next 7 Days",
        badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800",
        headerColor: "border-l-4 border-l-blue-500",
        items: sortByDate(thisWeek, true),
        icon: Truck,
      },
      {
        id: "nextWeek",
        title: "Next Week",
        badge: "8-14 Days",
        badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
        headerColor: "border-l-4 border-l-indigo-500",
        items: sortByDate(nextWeek, true),
        icon: Calendar,
      },
      {
        id: "later",
        title: "Later Deliveries",
        badge: "15+ Days",
        badgeColor: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border-slate-300 dark:border-zinc-700",
        headerColor: "border-l-4 border-l-slate-400 dark:border-l-zinc-600",
        items: sortByDate(later, true),
        icon: CalendarDays,
      },
      {
        id: "completed",
        title: "Recently Received",
        badge: "Stock Added",
        badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
        headerColor: "border-l-4 border-l-emerald-500",
        items: sortByDate(completed, false).slice(0, 10),
        icon: CheckCircle2,
      },
    ];
  }, [filteredOrders]);

  // Calendar matrix calculations
  const calendarData = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
    const totalDays = lastDayOfMonth.getDate();

    // Map deliveries by YYYY-MM-DD
    const deliveryMap: Record<string, PurchaseOrder[]> = {};
    filteredOrders.forEach((o) => {
      if (o.expectedDelivery) {
        const key = o.expectedDelivery.slice(0, 10);
        if (!deliveryMap[key]) deliveryMap[key] = [];
        deliveryMap[key].push(o);
      }
    });

    const days = [];
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: d,
        dateKey: key,
        dayNum,
        isCurrentMonth: false,
        isToday: false,
        orders: deliveryMap[key] || [],
      });
    }

    // Current month days
    const todayStr = new Date().toISOString().slice(0, 10);
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const d = new Date(year, month, dayNum);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: d,
        dateKey: key,
        dayNum,
        isCurrentMonth: true,
        isToday: key === todayStr,
        orders: deliveryMap[key] || [],
      });
    }

    // Next month padding to fill grid (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(year, month + 1, dayNum);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: d,
        dateKey: key,
        dayNum,
        isCurrentMonth: false,
        isToday: false,
        orders: deliveryMap[key] || [],
      });
    }

    return {
      monthName: currentCalendarDate.toLocaleString("default", { month: "long", year: "numeric" }),
      days,
    };
  }, [currentCalendarDate, filteredOrders]);

  const handleOpenReschedule = (po: PurchaseOrder) => {
    setReschedulingPo(po);
    setNewDeliveryDate(po.expectedDelivery || new Date().toISOString().slice(0, 10));
    setRescheduleReason("");
  };

  const handleSaveReschedule = async () => {
    if (!reschedulingPo || !newDeliveryDate) return;
    setIsSavingReschedule(true);
    try {
      const noteAddition = rescheduleReason.trim()
        ? `\n[Rescheduled to ${newDeliveryDate}: ${rescheduleReason.trim()}]`
        : `\n[Rescheduled expected delivery to ${newDeliveryDate}]`;

      const updated: PurchaseOrder = {
        ...reschedulingPo,
        expectedDelivery: newDeliveryDate,
        notes: ((reschedulingPo.notes || "") + noteAddition).trim(),
      };
      await onUpdateOrder(updated);
      setReschedulingPo(null);
    } catch (err) {
      console.error("Failed to reschedule PO delivery:", err);
    } finally {
      setIsSavingReschedule(false);
    }
  };

  const handleQuickAddDays = (days: number) => {
    const base = new Date();
    base.setDate(base.getDate() + days);
    setNewDeliveryDate(base.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP STATS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[--color-ink-500] font-medium mb-1">
            <span>Scheduled Shipments</span>
            <Truck size={16} className="text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[--color-ink-900]">
            {kpis.activePendingCount}
          </div>
          <p className="text-[11px] text-[--color-ink-400] mt-0.5">Active inbound orders in pipeline</p>
        </div>

        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[--color-ink-500] font-medium mb-1">
            <span>Arriving This Week</span>
            <Clock size={16} className="text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {kpis.dueThisWeekCount}
          </div>
          <p className="text-[11px] text-[--color-ink-400] mt-0.5">Expected within next 7 days</p>
        </div>

        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[--color-ink-500] font-medium mb-1">
            <span>Overdue Alerts</span>
            <AlertTriangle size={16} className="text-rose-500" />
          </div>
          <div className={`text-xl sm:text-2xl font-bold ${kpis.overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}`}>
            {kpis.overdueCount}
          </div>
          <p className="text-[11px] text-[--color-ink-400] mt-0.5">
            {kpis.overdueCount > 0 ? "Urgent supplier dispatch follow-up required" : "All shipments are on schedule"}
          </p>
        </div>

        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[--color-ink-500] font-medium mb-1">
            <span>Inbound Pipeline Value</span>
            <span className="text-xs font-bold text-emerald-500">₹</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
            {formatCurrency(kpis.totalScheduledValue)}
          </div>
          <p className="text-[11px] text-[--color-ink-400] mt-0.5">Total value of scheduled stock</p>
        </div>
      </div>

      {/* 2. SCHEDULE TOOLBAR */}
      <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-3 sm:p-4 shadow-2xs space-y-3">
        {/* ROW 1: Search + View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search schedule by PO #, part, supplier, depot…"
              className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] pl-9 pr-8 py-2 text-xs sm:text-sm text-[--color-ink-900] placeholder:text-[--color-ink-400] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search size={15} className="absolute left-3 top-2.5 text-[--color-ink-400]" />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-[--color-ink-400] hover:text-[--color-ink-700] cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Schedule View Toggle: Timeline Pipeline vs Calendar Matrix */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-[--color-border] bg-[--color-surface-1] p-0.5">
              <button
                onClick={() => setScheduleMode("pipeline")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  scheduleMode === "pipeline"
                    ? "bg-[--color-surface-0] text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-[--color-ink-500] hover:text-[--color-ink-800]"
                }`}
                title="Delivery Pipeline Columns"
              >
                <Truck size={14} />
                <span>Timeline Pipeline</span>
              </button>
              <button
                onClick={() => setScheduleMode("calendar")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  scheduleMode === "calendar"
                    ? "bg-[--color-surface-0] text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-[--color-ink-500] hover:text-[--color-ink-800]"
                }`}
                title="Monthly Calendar Matrix"
              >
                <Calendar size={14} />
                <span>Monthly Calendar</span>
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: Filter Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[--color-border]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[--color-ink-500] hidden sm:inline mr-1">
              Filters:
            </span>

            {/* Urgency Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as any)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                urgencyFilter !== "All"
                  ? "border-blue-500 bg-blue-50/40 text-blue-700 dark:text-blue-300 font-semibold"
                  : "border-[--color-border] bg-[--color-surface-1] text-[--color-ink-800]"
              }`}
            >
              <option value="All">All Schedule Statuses</option>
              <option value="overdue">🚨 Overdue Only ({kpis.overdueCount})</option>
              <option value="week">🚚 Arriving in 7 Days ({kpis.dueThisWeekCount})</option>
              <option value="received">✅ Received Stock</option>
            </select>

            {/* Depot Filter */}
            <select
              value={depotFilter}
              onChange={(e) => setDepotFilter(e.target.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[200px] truncate ${
                depotFilter !== "All"
                  ? "border-blue-500 bg-blue-50/40 text-blue-700 dark:text-blue-300 font-semibold"
                  : "border-[--color-border] bg-[--color-surface-1] text-[--color-ink-800]"
              }`}
            >
              <option value="All">All Destination Depots</option>
              {distinctDepots.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Supplier Filter */}
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[200px] truncate ${
                supplierFilter !== "All"
                  ? "border-blue-500 bg-blue-50/40 text-blue-700 dark:text-blue-300 font-semibold"
                  : "border-[--color-border] bg-[--color-surface-1] text-[--color-ink-800]"
              }`}
            >
              <option value="All">All Suppliers ({distinctSuppliers.length})</option>
              {distinctSuppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 ml-auto text-xs">
            <span className="text-[--color-ink-500]">
              Showing <strong className="text-[--color-ink-900]">{filteredOrders.length}</strong> scheduled POs
            </span>
            {(search || depotFilter !== "All" || supplierFilter !== "All" || urgencyFilter !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setDepotFilter("All");
                  setSupplierFilter("All");
                  setUrgencyFilter("All");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-semibold cursor-pointer underline"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN SCHEDULE VIEW */}
      {scheduleMode === "pipeline" ? (
        /* TIMELINE PIPELINE BOARD */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {pipelineBuckets.map((bucket) => {
            const Icon = bucket.icon;
            const totalBucketValue = bucket.items.reduce((acc, curr) => acc + (curr.total || 0), 0);

            return (
              <div
                key={bucket.id}
                className="rounded-xl border border-[--color-border] bg-[--color-surface-0] overflow-hidden flex flex-col min-h-[450px]"
              >
                {/* Bucket Header */}
                <div className={`p-3 bg-[--color-surface-1] border-b border-[--color-border] ${bucket.headerColor}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[--color-ink-900]">
                      <Icon size={14} />
                      <span>{bucket.title}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${bucket.badgeColor}`}>
                      {bucket.items.length}
                    </span>
                  </div>
                  <div className="text-[11px] text-[--color-ink-500] font-medium">
                    {formatCurrency(totalBucketValue)}
                  </div>
                </div>

                {/* Bucket Items */}
                <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[600px]">
                  {bucket.items.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-center text-xs text-[--color-ink-400] italic p-4">
                      <span>No deliveries in this window</span>
                    </div>
                  ) : (
                    bucket.items.map((po) => {
                      const diff = getDaysDiff(po.expectedDelivery);
                      const relative = getRelativeDateLabel(diff);

                      return (
                        <div
                          key={po.poNumber}
                          className="rounded-lg border border-[--color-border] bg-[--color-surface-0] hover:border-blue-400/60 dark:hover:border-blue-500/60 transition-all p-3 shadow-2xs hover:shadow-xs space-y-2"
                        >
                          {/* PO # & Status */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <button
                                onClick={() => onViewPo(po)}
                                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer block text-left"
                              >
                                {po.poNumber}
                              </button>
                              <div className="text-[11px] font-semibold text-[--color-ink-800] truncate max-w-[140px] mt-0.5">
                                {po.supplier}
                              </div>
                            </div>
                            <StatusBadge label={po.status} />
                          </div>

                          {/* Depot & Expected Date */}
                          <div className="space-y-1 text-[11px]">
                            <div className="flex items-center gap-1 text-[--color-ink-500]">
                              <MapPin size={11} className="shrink-0 text-slate-400" />
                              <span className="truncate">{po.depot || "Central Stores"}</span>
                            </div>

                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-[--color-ink-500]">Scheduled:</span>
                              <span className="font-semibold text-[--color-ink-800]">{po.expectedDelivery || "TBD"}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-[--color-ink-500]">Timeline:</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${relative.color}`}>
                                {relative.text}
                              </span>
                            </div>
                          </div>

                          {/* Line Items Preview */}
                          {po.lines && po.lines.length > 0 && (
                            <div className="pt-1.5 border-t border-[--color-border]/60">
                              <p className="text-[10px] font-semibold text-[--color-ink-400] mb-0.5">Parts:</p>
                              <div className="space-y-0.5 max-h-16 overflow-y-auto pr-1">
                                {po.lines.map((l, idx) => (
                                  <div key={idx} className="text-[11px] flex justify-between text-[--color-ink-700] truncate">
                                    <span className="truncate pr-1">{l.part}</span>
                                    <span className="font-semibold shrink-0">×{l.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Total Value */}
                          <div className="flex items-center justify-between pt-1 border-t border-[--color-border] text-xs font-semibold">
                            <span className="text-[--color-ink-500] text-[11px]">Total:</span>
                            <span className="text-[--color-ink-900]">{formatCurrency(po.total)}</span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 pt-1 border-t border-[--color-border]/50">
                            {po.status !== "Received" && po.status !== "Closed" && (
                              <button
                                onClick={() => handleOpenReschedule(po)}
                                className="flex-1 flex items-center justify-center gap-1 rounded bg-[--color-surface-1] hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 py-1 text-[11px] font-medium border border-[--color-border] cursor-pointer transition-colors"
                                title="Reschedule Delivery Date"
                              >
                                <Calendar size={11} />
                                <span>Reschedule</span>
                              </button>
                            )}

                            {po.status !== "Received" && po.status !== "Closed" && (
                              <button
                                onClick={() => onStatusChange(po.poNumber, "Received")}
                                className="flex items-center justify-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 px-2 py-1 text-[11px] font-medium border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-colors"
                                title="Receive stock into inventory"
                              >
                                <PackageCheck size={11} />
                                <span className="hidden sm:inline">Receive</span>
                              </button>
                            )}

                            <button
                              onClick={() => onPdfPo(po)}
                              className="rounded p-1 text-[--color-ink-500] hover:text-[--color-ink-900] hover:bg-[--color-surface-2] cursor-pointer"
                              title="Download PDF"
                            >
                              <FileText size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CALENDAR MONTH VIEW */
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] overflow-hidden shadow-2xs">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[--color-border] bg-[--color-surface-1]">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[--color-ink-900]">
                {calendarData.monthName}
              </h2>
              <span className="text-xs text-[--color-ink-500] hidden sm:inline">
                (Click on any date to inspect scheduled supplies)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const prev = new Date(currentCalendarDate);
                  prev.setMonth(prev.getMonth() - 1);
                  setCurrentCalendarDate(prev);
                }}
                className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-1.5 text-[--color-ink-700] hover:bg-[--color-surface-2] cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentCalendarDate(new Date())}
                className="rounded-lg border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1 text-xs font-semibold text-[--color-ink-800] hover:bg-[--color-surface-2] cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const next = new Date(currentCalendarDate);
                  next.setMonth(next.getMonth() + 1);
                  setCurrentCalendarDate(next);
                }}
                className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-1.5 text-[--color-ink-700] hover:bg-[--color-surface-2] cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-[--color-border] bg-[--color-surface-1]/50 text-center text-xs font-bold text-[--color-ink-500] py-2">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div className="text-blue-600 dark:text-blue-400">Sat</div>
            <div className="text-rose-600 dark:text-rose-400">Sun</div>
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[--color-border] border-b border-[--color-border]">
            {calendarData.days.map((day, idx) => {
              return (
                <div
                  key={idx}
                  className={`min-h-[110px] sm:min-h-[130px] p-1.5 sm:p-2 flex flex-col transition-colors ${
                    day.isCurrentMonth
                      ? "bg-[--color-surface-0]"
                      : "bg-[--color-surface-1]/40 opacity-40"
                  } ${day.isToday ? "ring-2 ring-blue-500 ring-inset bg-blue-50/10" : ""}`}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                        day.isToday
                          ? "bg-blue-600 text-white font-extrabold shadow-xs"
                          : day.isCurrentMonth
                          ? "text-[--color-ink-900]"
                          : "text-[--color-ink-400]"
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    {day.orders.length > 0 && (
                      <span className="text-[10px] font-bold px-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {day.orders.length} PO{day.orders.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Day delivery cards */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[100px]">
                    {day.orders.map((po) => {
                      const isComplete = po.status === "Received" || po.status === "Closed";
                      const diff = getDaysDiff(po.expectedDelivery);
                      const isOverdue = !isComplete && diff !== null && diff < 0;

                      return (
                        <div
                          key={po.poNumber}
                          onClick={() => onViewPo(po)}
                          className={`rounded px-1.5 py-1 text-[10px] border cursor-pointer transition-all hover:scale-[1.02] shadow-2xs truncate ${
                            isComplete
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                              : isOverdue
                              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold"
                              : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                          }`}
                          title={`${po.poNumber} - ${po.supplier} (${po.depot})\nExpected: ${po.expectedDelivery}\nTotal: ₹${po.total}`}
                        >
                          <div className="font-bold truncate">{po.poNumber}</div>
                          <div className="text-[9px] opacity-80 truncate">{po.supplier}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QUICK RESCHEDULE MODAL */}
      {reschedulingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[--color-border] bg-[--color-surface-0] p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[--color-border] pb-3">
              <div>
                <h3 className="text-base font-bold text-[--color-ink-900]">Reschedule Supply Delivery</h3>
                <p className="text-xs text-[--color-ink-500]">{reschedulingPo.poNumber} — {reschedulingPo.supplier}</p>
              </div>
              <button
                onClick={() => setReschedulingPo(null)}
                className="rounded-lg p-1.5 text-[--color-ink-400] hover:text-[--color-ink-800] hover:bg-[--color-surface-2] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3">
                <div className="flex justify-between mb-1">
                  <span className="text-[--color-ink-500]">Current Expected Date:</span>
                  <span className="font-bold text-[--color-ink-900]">{reschedulingPo.expectedDelivery || "None"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[--color-ink-500]">Destination Depot:</span>
                  <span className="font-bold text-[--color-ink-900]">{reschedulingPo.depot}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[--color-ink-800] mb-1">
                  New Scheduled Delivery Date *
                </label>
                <input
                  type="date"
                  value={newDeliveryDate}
                  onChange={(e) => setNewDeliveryDate(e.target.value)}
                  className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] text-[--color-ink-500] font-medium block mb-1.5">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickAddDays(2)}
                    className="rounded border border-[--color-border] bg-[--color-surface-1] px-2 py-1 text-[11px] hover:bg-[--color-surface-2] cursor-pointer"
                  >
                    +2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddDays(7)}
                    className="rounded border border-[--color-border] bg-[--color-surface-1] px-2 py-1 text-[11px] hover:bg-[--color-surface-2] cursor-pointer"
                  >
                    +1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddDays(14)}
                    className="rounded border border-[--color-border] bg-[--color-surface-1] px-2 py-1 text-[11px] hover:bg-[--color-surface-2] cursor-pointer"
                  >
                    +2 Weeks
                  </button>
                </div>
              </div>

              {/* Reason / Logistics Note */}
              <div>
                <label className="block font-semibold text-[--color-ink-800] mb-1">
                  Reason / Logistics Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Supplier transit delay, Depot dock maintenance, Expedited priority…"
                  className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] placeholder:text-[--color-ink-400] focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[--color-border]">
              <button
                type="button"
                onClick={() => setReschedulingPo(null)}
                className="rounded-lg border border-[--color-border] px-3.5 py-1.5 text-xs font-semibold text-[--color-ink-700] hover:bg-[--color-surface-2] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReschedule}
                disabled={!newDeliveryDate || isSavingReschedule}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 px-4 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer transition-all"
              >
                {isSavingReschedule ? "Saving…" : "Save New Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
