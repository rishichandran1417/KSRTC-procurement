import { Menu, AlertTriangle, ShieldCheck } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useSidebar } from "../../state/SidebarContext";
import { useAlerts } from "../../state/AlertsContext";
import { LowStockAlertModal } from "../ui/LowStockAlertModal";

export function TopBar({
  title,
  subtitle,
  showAlerts,
}: {
  title: string;
  subtitle?: string;
  showFilters?: boolean;
  showAlerts?: boolean;
}) {
  const { toggleMobile } = useSidebar();
  const { totalAlerts, criticalItems, openAlertModal } = useAlerts();
  const location = useLocation();

  const isRelevantPage =
    showAlerts !== undefined
      ? showAlerts
      : location.pathname === "/dashboard" ||
        location.pathname === "/" ||
        location.pathname === "/inventory";

  return (
    <>
      <div className="border-b border-[--color-border] bg-[--color-surface-0] px-4 py-3 sm:px-6 sm:py-3.5">
        <div className="flex items-center justify-between gap-3">
          {/* LEFT: Title & Hamburger */}
          <div className="flex items-center min-w-0">
            <button
              onClick={toggleMobile}
              className="mr-2.5 rounded-md p-1.5 text-[--color-ink-700] hover:bg-[--color-surface-2] active:scale-95 transition-transform lg:hidden shrink-0 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[--color-ink-900] truncate">{title}</h1>
              {subtitle ? <p className="text-xs sm:text-sm text-[--color-ink-500] truncate sm:whitespace-normal">{subtitle}</p> : null}
            </div>
          </div>

          {/* RIGHT: Low Stock Alert Trigger - only on relevant pages */}
          {isRelevantPage ? (
            <div className="flex items-center gap-2 shrink-0">
              {totalAlerts > 0 ? (
                <button
                  onClick={openAlertModal}
                  className="group flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 active:scale-98 transition-all shadow-xs cursor-pointer"
                  title={`${totalAlerts} items below safety thresholds (${criticalItems.length} Critical stockout risk). Click to review & reorder.`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                  </span>
                  <AlertTriangle size={15} className="text-red-500 shrink-0" />
                  <span className="hidden sm:inline">Low Stock Alert</span>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white shadow-xs">
                    {totalAlerts}
                  </span>
                </button>
              ) : (
                <button
                  onClick={openAlertModal}
                  className="flex items-center gap-1.5 rounded-full border border-[--color-border] bg-[--color-surface-1] px-3 py-1.5 text-xs font-medium text-[--color-healthy-500] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
                  title="All inventory stock levels are healthy"
                >
                  <ShieldCheck size={14} className="text-[--color-healthy-500]" />
                  <span className="hidden sm:inline">Stock Healthy</span>
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <LowStockAlertModal />
    </>
  );
}
