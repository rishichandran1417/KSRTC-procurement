import { useState, useMemo, useRef } from "react";
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
  const [urgencyFilter, setUrgencyFilter] = useState<"All" | "needs_reschedule" | "overdue" | "week" | "received">("All");

  // Calendar month & date selection state
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);

  // Quick Reschedule Modal State
  const [reschedulingPo, setReschedulingPo] = useState<PurchaseOrder | null>(null);
  const [newDeliveryDate, setNewDeliveryDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleStatus, setRescheduleStatus] = useState<PoStatus>("Ordered");
  const [selectedPresetDays, setSelectedPresetDays] = useState<number | null>(null);
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

      if (urgencyFilter === "needs_reschedule") {
        if (isReceived) return false;
        const isOverdue = diff !== null && diff < 0;
        const isDueToday = diff === 0;
        if (!isOverdue && !isDueToday) return false;
      } else if (urgencyFilter === "overdue") {
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
    let needsRescheduleCount = 0;
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
        if (diff !== null && diff <= 0) {
          needsRescheduleCount += 1;
        }
      }
    });

    return {
      overdueCount,
      dueThisWeekCount,
      needsRescheduleCount,
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
    const initialDate = po.expectedDelivery || new Date().toISOString().slice(0, 10);
    setNewDeliveryDate(initialDate);
    setRescheduleReason("");
    setRescheduleStatus(po.status || "Ordered");
    setSelectedPresetDays(null);
  };

  const handleQuickAddDays = (days: number) => {
    setSelectedPresetDays(days);
    const base = new Date();
    base.setDate(base.getDate() + days);
    setNewDeliveryDate(base.toISOString().slice(0, 10));
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
        status: rescheduleStatus,
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

  const pipelineContainerRef = useRef<HTMLDivElement>(null);

  const scrollPipeline = (direction: "left" | "right") => {
    if (!pipelineContainerRef.current) return;
    const scrollAmount = 330;
    pipelineContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP STATS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[--color-ink-500] font-medium mb-1">
            <span className="truncate pr-1">Scheduled Shipments</span>
            <Truck size={16} className="text-blue-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-[--color-ink-900] truncate">
            {kpis.activePendingCount}
          </div>
          <p className="text-[10px] sm:text-[11px] text-[--color-ink-400] mt-0.5 truncate">Active inbound orders in pipeline</p>
        </div>

        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[--color-ink-500] font-medium mb-1">
            <span className="truncate pr-1">Arriving This Week</span>
            <Clock size={16} className="text-indigo-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 truncate">
            {kpis.dueThisWeekCount}
          </div>
          <p className="text-[10px] sm:text-[11px] text-[--color-ink-400] mt-0.5 truncate">Expected within next 7 days</p>
        </div>

        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[--color-ink-500] font-medium mb-1">
            <span className="truncate pr-1">Overdue Alerts</span>
            <AlertTriangle size={16} className="text-rose-500 shrink-0" />
          </div>
          <div className={`text-lg sm:text-2xl font-bold truncate ${kpis.overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}`}>
            {kpis.overdueCount}
          </div>
          <p className="text-[10px] sm:text-[11px] text-[--color-ink-400] mt-0.5 truncate">
            {kpis.overdueCount > 0 ? "Urgent supplier dispatch required" : "All shipments are on schedule"}
          </p>
        </div>

        <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-3 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[--color-ink-500] font-medium mb-1">
            <span className="truncate pr-1">Inbound Pipeline Value</span>
            <span className="text-xs font-bold text-emerald-500 shrink-0">₹</span>
          </div>
          <div className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
            {formatCurrency(kpis.totalScheduledValue)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-[--color-ink-400] mt-0.5 truncate">Total value of scheduled stock</p>
        </div>
      </div>

      {/* 2. SCHEDULE TOOLBAR */}
      <div className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-3 sm:p-4 shadow-2xs space-y-3">
        {/* ROW 1: Search + View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 sm:max-w-md">
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
          <div className="flex items-center w-full sm:w-auto">
            <div className="flex w-full sm:w-auto items-center rounded-lg border border-[--color-border] bg-[--color-surface-1] p-0.5">
              <button
                onClick={() => setScheduleMode("pipeline")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-[--color-border]">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-[--color-ink-500] hidden md:inline mr-1">
              Filters:
            </span>

            {/* Urgency Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as any)}
              className={`flex-1 sm:flex-initial rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                urgencyFilter !== "All"
                  ? "border-blue-500 bg-blue-50/40 text-blue-700 dark:text-blue-300 font-semibold"
                  : "border-[--color-border] bg-[--color-surface-1] text-[--color-ink-800]"
              }`}
            >
              <option value="All">All Schedule Statuses</option>
              <option value="needs_reschedule">⚠️ Needs Rescheduling ({kpis.needsRescheduleCount})</option>
              <option value="overdue">🚨 Overdue Only ({kpis.overdueCount})</option>
              <option value="week">🚚 Arriving in 7 Days ({kpis.dueThisWeekCount})</option>
              <option value="received">✅ Received Stock</option>
            </select>

            {/* Depot Filter */}
            <select
              value={depotFilter}
              onChange={(e) => setDepotFilter(e.target.value)}
              className={`flex-1 sm:flex-initial rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[200px] truncate ${
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
              className={`w-full sm:w-auto rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer sm:max-w-[200px] truncate ${
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

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto text-xs pt-1 sm:pt-0 border-t sm:border-t-0 border-[--color-border]/50">
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
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-semibold cursor-pointer underline shrink-0"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN SCHEDULE VIEW */}
      {scheduleMode === "pipeline" ? (
        <div className="space-y-3">
          {/* Quick Jump Column Pills & Scroll Controls (Visible on all screens) */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 min-w-0">
              <span className="text-[11px] font-semibold text-[--color-ink-500] uppercase tracking-wider shrink-0 mr-1 hidden md:inline">
                Columns:
              </span>
              {pipelineBuckets.map((bucket) => {
                const Icon = bucket.icon;
                return (
                  <button
                    key={`jump-btn-${bucket.id}`}
                    onClick={() => {
                      const el = document.getElementById(`schedule-bucket-${bucket.id}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                    }}
                    className="px-2.5 py-1 rounded-full border border-[--color-border] bg-[--color-surface-0] hover:bg-[--color-surface-2] hover:border-blue-400 dark:hover:border-blue-500 text-[--color-ink-700] shrink-0 font-medium text-[11px] flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    <Icon size={12} className="opacity-75" />
                    <span>{bucket.title}</span>
                    <span className="font-bold text-[10px] px-1 rounded-full bg-[--color-surface-2] text-[--color-ink-600]">
                      {bucket.items.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Desktop / Laptop Scroll Arrows */}
            <div className="hidden sm:flex items-center gap-1 shrink-0 pl-2">
              <button
                onClick={() => scrollPipeline("left")}
                className="p-1.5 rounded-lg border border-[--color-border] bg-[--color-surface-0] text-[--color-ink-600] hover:text-[--color-ink-900] hover:bg-[--color-surface-2] transition-colors cursor-pointer shadow-2xs"
                title="Scroll columns left"
                aria-label="Scroll board left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollPipeline("right")}
                className="p-1.5 rounded-lg border border-[--color-border] bg-[--color-surface-0] text-[--color-ink-600] hover:text-[--color-ink-900] hover:bg-[--color-surface-2] transition-colors cursor-pointer shadow-2xs"
                title="Scroll columns right"
                aria-label="Scroll board right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* TIMELINE PIPELINE BOARD: Smooth horizontal scrolling Kanban board on all screens */}
          <div
            ref={pipelineContainerRef}
            className="flex gap-3.5 sm:gap-4 items-start overflow-x-auto pb-4 pt-1 snap-x snap-mandatory custom-scrollbar scroll-smooth -mx-2 px-2 sm:mx-0 sm:px-0"
          >
            {pipelineBuckets.map((bucket) => {
              const Icon = bucket.icon;
              const totalBucketValue = bucket.items.reduce((acc, curr) => acc + (curr.total || 0), 0);

              return (
                <div
                  key={bucket.id}
                  id={`schedule-bucket-${bucket.id}`}
                  className="w-[86vw] max-w-[340px] sm:w-[310px] md:w-[320px] shrink-0 snap-center rounded-xl border border-[--color-border] bg-[--color-surface-0] overflow-hidden flex flex-col min-h-[480px] shadow-2xs hover:shadow-xs transition-shadow"
                >
                  {/* Bucket Header */}
                  <div className={`p-3 bg-[--color-surface-1] border-b border-[--color-border] ${bucket.headerColor}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[--color-ink-900] truncate">
                        <Icon size={14} className="shrink-0" />
                        <span className="truncate">{bucket.title}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${bucket.badgeColor}`}>
                        {bucket.items.length}
                      </span>
                    </div>
                    <div className="text-[11px] text-[--color-ink-500] font-medium">
                      {formatCurrency(totalBucketValue)}
                    </div>
                  </div>

                  {/* Bucket Items */}
                  <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[620px] custom-scrollbar">
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
                              <div className="min-w-0 flex-1">
                                <button
                                  onClick={() => onViewPo(po)}
                                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer block text-left truncate"
                                >
                                  {po.poNumber}
                                </button>
                                <div className="text-[11px] font-semibold text-[--color-ink-800] truncate mt-0.5" title={po.supplier}>
                                  {po.supplier}
                                </div>
                              </div>
                              <div className="shrink-0">
                                <StatusBadge label={po.status} />
                              </div>
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
                                <div className="space-y-0.5 max-h-16 overflow-y-auto pr-1 custom-scrollbar">
                                  {po.lines.map((l, idx) => (
                                    <div key={idx} className="text-[11px] flex justify-between text-[--color-ink-700] truncate">
                                      <span className="truncate pr-1" title={l.part}>{l.part}</span>
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
                            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[--color-border]/60">
                              {po.status !== "Received" && po.status !== "Closed" && (
                                <button
                                  onClick={() => handleOpenReschedule(po)}
                                  className="flex-1 min-w-[95px] flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 py-1.5 px-2 text-[11px] font-semibold border border-blue-200 dark:border-blue-900/60 cursor-pointer transition-colors shadow-2xs active:scale-95"
                                  title="Reschedule Delivery Date"
                                >
                                  <Calendar size={12} className="shrink-0" />
                                  <span>Reschedule</span>
                                </button>
                              )}

                              {po.status !== "Received" && po.status !== "Closed" && (
                                <button
                                  onClick={() => onStatusChange(po.poNumber, "Received")}
                                  className="flex-1 min-w-[75px] flex items-center justify-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 py-1.5 px-1.5 text-[11px] font-medium border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-colors"
                                  title="Receive stock into inventory"
                                >
                                  <PackageCheck size={11} className="shrink-0" />
                                  <span>Receive</span>
                                </button>
                              )}

                              <button
                                onClick={() => onPdfPo(po)}
                                className="rounded p-1.5 text-[--color-ink-500] hover:text-[--color-ink-900] hover:bg-[--color-surface-2] cursor-pointer shrink-0 ml-auto sm:ml-0 transition-colors"
                                title="Download PDF"
                                aria-label="Print/Download PDF"
                              >
                                <FileText size={13} />
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
                (Click any date to inspect & reschedule deliveries)
              </span>
              <span className="text-[10px] text-[--color-ink-400] sm:hidden">
                (↔ Swipe)
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

          {/* Horizontally scrollable on mobile, full width on desktop */}
          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[640px] sm:min-w-0">
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
                  const isSelected = selectedCalendarDateKey === day.dateKey;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (day.orders.length > 0) {
                          setSelectedCalendarDateKey(isSelected ? null : day.dateKey);
                        }
                      }}
                      className={`min-h-[110px] sm:min-h-[130px] p-1.5 sm:p-2 flex flex-col transition-all cursor-pointer ${
                        day.isCurrentMonth
                          ? "bg-[--color-surface-0] hover:bg-[--color-surface-1]"
                          : "bg-[--color-surface-1]/40 opacity-40"
                      } ${day.isToday ? "ring-2 ring-blue-500 ring-inset bg-blue-50/10" : ""} ${
                        isSelected ? "ring-2 ring-indigo-500 ring-inset bg-indigo-50/15" : ""
                      }`}
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
                      <div className="space-y-1 flex-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                        {day.orders.map((po) => {
                          const isComplete = po.status === "Received" || po.status === "Closed";
                          const diff = getDaysDiff(po.expectedDelivery);
                          const isOverdue = !isComplete && diff !== null && diff < 0;

                          return (
                            <div
                              key={po.poNumber}
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewPo(po);
                              }}
                              className={`rounded px-1.5 py-1 text-[10px] border cursor-pointer transition-all hover:scale-[1.02] shadow-2xs truncate ${
                                isComplete
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                                  : isOverdue
                                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold"
                                  : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                              }`}
                              title={`${po.poNumber} - ${po.supplier} (${po.depot})\nExpected: ${po.expectedDelivery}\nTotal: ₹${po.total}\nClick to view`}
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
          </div>

          {/* Selected Date Inspector (Especially useful on mobile/tablet) */}
          {selectedCalendarDateKey && (
            <div className="p-3.5 sm:p-4 border-t border-[--color-border] bg-[--color-surface-1] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-blue-500" />
                  <h3 className="text-xs sm:text-sm font-bold text-[--color-ink-900]">
                    Scheduled Deliveries on {selectedCalendarDateKey}
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {calendarData.days.find((d) => d.dateKey === selectedCalendarDateKey)?.orders.length || 0} POs
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCalendarDateKey(null)}
                  className="text-xs text-[--color-ink-500] hover:text-[--color-ink-900] font-semibold cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {calendarData.days
                  .find((d) => d.dateKey === selectedCalendarDateKey)
                  ?.orders.map((po) => (
                    <div
                      key={`cal-detail-${po.poNumber}`}
                      className="rounded-xl border border-[--color-border] bg-[--color-surface-0] p-3 space-y-2 shadow-2xs hover:shadow-xs transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => onViewPo(po)}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline text-left truncate block"
                          >
                            {po.poNumber}
                          </button>
                          <div className="text-[11px] font-medium text-[--color-ink-800] truncate mt-0.5">
                            {po.supplier}
                          </div>
                        </div>
                        <StatusBadge label={po.status} />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[--color-ink-500]">
                        <span>Depot: <strong className="text-[--color-ink-800]">{po.depot || "Central"}</strong></span>
                        <span className="font-semibold text-[--color-ink-900]">{formatCurrency(po.total)}</span>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-[--color-border]/60">
                        {po.status !== "Received" && po.status !== "Closed" && (
                          <button
                            onClick={() => handleOpenReschedule(po)}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 text-[11px] font-semibold text-center cursor-pointer hover:bg-blue-100 flex items-center justify-center gap-1 active:scale-95 transition-all"
                          >
                            <Calendar size={11} />
                            <span>Reschedule</span>
                          </button>
                        )}
                        {po.status !== "Received" && po.status !== "Closed" && (
                          <button
                            onClick={() => onStatusChange(po.poNumber, "Received")}
                            className="py-1.5 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-center cursor-pointer hover:bg-emerald-100 flex items-center justify-center gap-1 active:scale-95 transition-all"
                          >
                            <PackageCheck size={11} />
                            <span>Receive</span>
                          </button>
                        )}
                        <button
                          onClick={() => onPdfPo(po)}
                          className="p-1.5 rounded-lg border border-[--color-border] bg-[--color-surface-1] text-[--color-ink-600] hover:text-[--color-ink-900] cursor-pointer shrink-0"
                          title="View PDF"
                        >
                          <FileText size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* QUICK RESCHEDULE MODAL */}
      {reschedulingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-[--color-border] bg-[--color-surface-0] p-4 sm:p-6 shadow-2xl space-y-4 custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[--color-border] pb-3 gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-[--color-ink-900]">Reschedule Supply Delivery</h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {reschedulingPo.poNumber}
                  </span>
                </div>
                <p className="text-xs text-[--color-ink-500] truncate mt-0.5">
                  {reschedulingPo.supplier} · {reschedulingPo.depot || "Central Stores"}
                </p>
              </div>
              <button
                onClick={() => setReschedulingPo(null)}
                className="rounded-lg p-1.5 text-[--color-ink-400] hover:text-[--color-ink-800] hover:bg-[--color-surface-2] transition-colors cursor-pointer shrink-0"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Visual Timeline Shift Card */}
              <div className="rounded-xl bg-[--color-surface-1] border border-[--color-border] p-3.5 space-y-2.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[--color-ink-500]">
                  Delivery Timeline Shift
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* Current Expected Date */}
                  <div className="rounded-lg border border-[--color-border] bg-[--color-surface-0] p-2.5">
                    <span className="text-[10px] text-[--color-ink-400] block mb-0.5">Current Scheduled:</span>
                    <div className="font-bold text-[--color-ink-900] text-sm">
                      {reschedulingPo.expectedDelivery || "TBD"}
                    </div>
                    <div className="text-[10px] mt-1">
                      <span className={`inline-block px-1.5 py-0.2 rounded font-medium ${getRelativeDateLabel(getDaysDiff(reschedulingPo.expectedDelivery)).color}`}>
                        {getRelativeDateLabel(getDaysDiff(reschedulingPo.expectedDelivery)).text}
                      </span>
                    </div>
                  </div>

                  {/* New Target Date */}
                  <div className="rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-2.5">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium block mb-0.5">New Target Delivery:</span>
                    <div className="font-bold text-blue-700 dark:text-blue-300 text-sm">
                      {newDeliveryDate || "Select a date"}
                    </div>
                    <div className="text-[10px] mt-1">
                      {newDeliveryDate ? (
                        <span className={`inline-block px-1.5 py-0.2 rounded font-medium ${getRelativeDateLabel(getDaysDiff(newDeliveryDate)).color}`}>
                          {getRelativeDateLabel(getDaysDiff(newDeliveryDate)).text}
                        </span>
                      ) : (
                        <span className="text-[--color-ink-400]">Pending selection</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Date Picker Input */}
              <div>
                <label className="block font-semibold text-[--color-ink-800] mb-1.5">
                  New Scheduled Delivery Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={newDeliveryDate}
                  onChange={(e) => {
                    setNewDeliveryDate(e.target.value);
                    setSelectedPresetDays(null);
                  }}
                  className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3.5 py-2 text-xs sm:text-sm text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] text-[--color-ink-500] font-semibold block mb-1.5">
                  Quick Shift Presets:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { label: "+2 Days", days: 2 },
                    { label: "+3 Days", days: 3 },
                    { label: "+5 Days", days: 5 },
                    { label: "+1 Week", days: 7 },
                    { label: "+2 Weeks", days: 14 },
                  ].map((preset) => {
                    const isSelected = selectedPresetDays === preset.days;
                    return (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => handleQuickAddDays(preset.days)}
                        className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer text-center ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                            : "border-[--color-border] bg-[--color-surface-1] text-[--color-ink-700] hover:bg-[--color-surface-2] hover:border-blue-300"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1-Tap Quick Reasons */}
              <div>
                <span className="text-[11px] text-[--color-ink-500] font-semibold block mb-1.5">
                  1-Tap Quick Reason (Tap to fill):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Supplier transit delay",
                    "Depot dock capacity full",
                    "Awaiting customs & QC inspection",
                    "Expedited emergency priority",
                    "Factory parts manufacturing backlog",
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setRescheduleReason(reason)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors cursor-pointer text-left ${
                        rescheduleReason === reason
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold"
                          : "border-[--color-border] bg-[--color-surface-1] text-[--color-ink-600] hover:bg-[--color-surface-2]"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason / Logistics Note */}
              <div>
                <label className="block font-semibold text-[--color-ink-800] mb-1">
                  Logistics Notes / Dispatch Remarks
                </label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Add specific notes or context for depot storekeepers and tracking…"
                  className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] placeholder:text-[--color-ink-400] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* PO Status Update */}
              <div>
                <label className="block font-semibold text-[--color-ink-800] mb-1">
                  Update Purchase Order Status
                </label>
                <select
                  value={rescheduleStatus}
                  onChange={(e) => setRescheduleStatus(e.target.value as PoStatus)}
                  className="w-full rounded-lg border border-[--color-border] bg-[--color-surface-1] px-3 py-2 text-xs text-[--color-ink-900] focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Ordered">Ordered (Active dispatch in transit)</option>
                  <option value="Approved">Approved (Awaiting release by vendor)</option>
                  <option value="Partially Received">Partially Received (Partial shipment arrived)</option>
                  <option value="Submitted">Submitted (Under processing)</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-[--color-border]">
              <button
                type="button"
                onClick={() => setReschedulingPo(null)}
                className="w-full sm:w-auto rounded-lg border border-[--color-border] bg-[--color-surface-1] px-4 py-2 text-xs font-semibold text-[--color-ink-700] hover:bg-[--color-surface-2] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReschedule}
                disabled={!newDeliveryDate || isSavingReschedule}
                className="w-full sm:w-auto rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Calendar size={13} />
                <span>{isSavingReschedule ? "Saving New Schedule…" : "Confirm Reschedule"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
