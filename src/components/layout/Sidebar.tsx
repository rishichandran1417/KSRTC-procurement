import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Calculator,
  Boxes,
  ClipboardList,
  Truck,
  BarChart3,
  Bot,
  Settings as SettingsIcon,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useSidebar } from "../../state/SidebarContext";

interface NavItem {
  to: string;
  label: string;
  icon?: any;
  imgSrc?: string;
  badge?: string;
}

const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [{ to: "/dashboard", label: "Control Tower", icon: LayoutDashboard }],
  },
  {
    label: "Supply & Inventory",
    items: [
      { to: "/inventory", label: "Central Inventory", icon: Boxes },
      { to: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
      { to: "/suppliers", label: "Supplier Directory", icon: Truck },
    ],
  },
  {
    label: "Planning & Models",
    items: [
      { to: "/forecast", label: "Demand Forecasting", icon: TrendingUp },
      { to: "/procurement", label: "PuLP Optimizer", icon: Calculator },
      { to: "/analytics", label: "Vendor Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Decision Support",
    items: [
      { to: "/ai-assistant", label: "SCION Assistant", icon: Bot, imgSrc: "/scion-logo.png" },
    ],
  },
];

export function Sidebar() {
  const { isMobileOpen, closeMobile, isCollapsed, toggleCollapsed } = useSidebar();

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Enterprise Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-[--color-border] bg-[--color-surface-0] transition-all duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? "w-64 translate-x-0 shadow-xl" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-16" : "lg:w-60"}`}
      >
        {/* Enterprise Brand Header */}
        <div
          className={`flex items-center border-b border-[--color-border] py-3 transition-all ${
            isCollapsed ? "lg:px-2.5 lg:justify-center px-4 justify-between" : "px-4 justify-between"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/ksrtc-app-icon.png"
              alt="KSRTC"
              className="h-7 w-7 rounded border border-[--color-border] object-cover shrink-0"
              title="KSRTC Central Logistics & Procurement"
            />
            <div className={`${isCollapsed ? "lg:hidden" : "block"} min-w-0`}>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  KSRTC
                </span>
                <span className="text-[9px] font-medium px-1 rounded bg-[--color-surface-2] text-[--color-ink-500]">
                  ERP
                </span>
              </div>
              <p className="text-xs font-semibold text-[--color-ink-900] truncate">
                Central Procurement
              </p>
            </div>
          </div>
          <button
            onClick={closeMobile}
            className="rounded p-1 text-[--color-ink-400] hover:bg-[--color-surface-1] hover:text-[--color-ink-700] lg:hidden cursor-pointer"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label ? (
                isCollapsed ? (
                  <div className="hidden lg:block my-2 border-t border-[--color-border]" />
                ) : (
                  <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[--color-ink-400]">
                    {group.label}
                  </p>
                )
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={closeMobile}
                      title={isCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center rounded-sm text-xs transition-colors cursor-pointer ${
                          isCollapsed
                            ? "lg:justify-center lg:px-2 lg:py-2 px-2.5 py-1.5 gap-2.5"
                            : "px-2.5 py-1.5 gap-2.5"
                        } ${
                          isActive
                            ? "border-l-2 border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 font-semibold text-blue-700 dark:text-blue-300"
                            : "text-[--color-ink-700] hover:bg-[--color-surface-1] hover:text-[--color-ink-900] border-l-2 border-transparent"
                        }`
                      }
                    >
                      {item.imgSrc ? (
                        <img
                          src={item.imgSrc}
                          alt={item.label}
                          className="h-4 w-4 object-contain shrink-0"
                        />
                      ) : (
                        <item.icon size={15} className="shrink-0" />
                      )}
                      <span className={`${isCollapsed ? "lg:hidden" : "inline"} truncate flex-1`}>
                        {item.label}
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer / Settings & Collapse */}
        <div className="border-t border-[--color-border] p-2 space-y-1 bg-[--color-surface-0]">
          <NavLink
            to="/settings/integrations"
            onClick={closeMobile}
            title={isCollapsed ? "System Integrations" : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-sm text-xs transition-colors cursor-pointer ${
                isCollapsed
                  ? "lg:justify-center lg:px-2 lg:py-2 px-2.5 py-1.5 gap-2.5"
                  : "px-2.5 py-1.5 gap-2.5"
              } ${
                isActive
                  ? "border-l-2 border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 font-semibold text-blue-700 dark:text-blue-300"
                  : "text-[--color-ink-700] hover:bg-[--color-surface-1] hover:text-[--color-ink-900] border-l-2 border-transparent"
              }`
            }
          >
            <SettingsIcon size={15} className="shrink-0" />
            <span className={`${isCollapsed ? "lg:hidden" : "inline"} truncate`}>
              Integrations & API
            </span>
          </NavLink>

          {/* Desktop Collapse / Expand Toggle */}
          <button
            onClick={toggleCollapsed}
            className={`hidden lg:flex items-center rounded-sm py-1.5 text-xs text-[--color-ink-400] hover:text-[--color-ink-800] hover:bg-[--color-surface-1] transition-colors cursor-pointer w-full ${
              isCollapsed ? "justify-center px-2" : "justify-start px-2.5 gap-2"
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={15} />
            ) : (
              <>
                <PanelLeftClose size={15} />
                <span className="text-[11px] font-medium">Collapse menu</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
