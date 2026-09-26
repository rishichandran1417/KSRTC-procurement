import { Menu, ShieldCheck } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useSidebar } from "../../state/SidebarContext";
import { useAlerts } from "../../state/AlertsContext";
import { LowStockAlertModal } from "../ui/LowStockAlertModal";

export function TopBar({
  title,
  subtitle,
  actions,
  showAlerts,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showFilters?: boolean;
  showAlerts?: boolean;
}) {
  const { toggleMobile } = useSidebar();
  const { totalAlerts, openAlertModal } = useAlerts();
  const location = useLocation();

  const isRelevantPage =
    showAlerts !== undefined
      ? showAlerts
      : location.pathname === "/dashboard" ||
        location.pathname === "/" ||
        location.pathname === "/inventory";

  return (
    <>
      <div className="border-b border-[--color-border] bg-[--color-surface-0] px-3.5 py-2.5 sm:px-6 sm:py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* LEFT: Title & Hamburger & Mobile Alert */}
          <div className="flex items-center justify-between sm:justify-start min-w-0 w-full sm:w-auto">
            <div className="flex items-center min-w-0">
              <button
                onClick={toggleMobile}
                className="mr-2 sm:mr-2.5 rounded-md p-1.5 text-[--color-ink-700] hover:bg-[--color-surface-2] active:scale-95 transition-transform lg:hidden shrink-0 cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-[--color-ink-900] truncate">{title}</h1>
                {subtitle ? <p className="text-[11px] sm:text-xs text-[--color-ink-500] truncate sm:whitespace-normal">{subtitle}</p> : null}
              </div>
            </div>

            {/* Mobile alert badge */}
            {isRelevantPage ? (
              <div className="sm:hidden shrink-0 ml-2">
                {totalAlerts > 0 ? (
                  <button
                    onClick={openAlertModal}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 cursor-pointer"
                    title={`${totalAlerts} items below safety thresholds.`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span className="text-[11px] font-bold">{totalAlerts}</span>
                  </button>
                ) : (
                  <button
                    onClick={openAlertModal}
                    className="flex items-center gap-1 rounded-lg border border-[--color-border] bg-[--color-surface-1] p-1.5 text-xs text-[--color-healthy-600] cursor-pointer"
                    title="All inventory stock levels are healthy"
                  >
                    <ShieldCheck size={14} />
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {/* RIGHT: Actions & Desktop Alert Trigger */}
          {actions || isRelevantPage ? (
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
              <div className="w-full sm:w-auto flex items-center">
                {actions}
              </div>
              {isRelevantPage ? (
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  {totalAlerts > 0 ? (
                    <button
                      onClick={openAlertModal}
                      className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 transition-colors cursor-pointer"
                      title={`${totalAlerts} items below safety thresholds. Click to review.`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="hidden md:inline">Low Stock</span>
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-md bg-amber-500/20 px-1 text-[10px] font-semibold text-amber-800 dark:text-amber-200">
                        {totalAlerts}
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={openAlertModal}
                      className="flex items-center gap-1.5 rounded-lg border border-[--color-border] bg-[--color-surface-1] px-2.5 py-1 text-xs font-medium text-[--color-healthy-600] hover:bg-[--color-surface-2] transition-colors cursor-pointer"
                      title="All inventory stock levels are healthy"
                    >
                      <ShieldCheck size={14} />
                      <span className="hidden md:inline">Stock Healthy</span>
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <LowStockAlertModal />
    </>
  );
}
