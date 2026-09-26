import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, Calculator, Boxes, ClipboardList,
  Truck, BarChart3, Settings as SettingsIcon, X, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { useSidebar } from "../../state/SidebarContext";

interface NavItem {
  to: string;
  label: string;
  icon?: any;
  imgSrc?: string;
}

const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Planning",
    items: [
      { to: "/forecast", label: "Forecasting", icon: TrendingUp },
      { to: "/procurement", label: "Procurement Optimization", icon: Calculator },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/inventory", label: "Inventory", icon: Boxes },
      { to: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
      { to: "/suppliers", label: "Suppliers", icon: Truck },
    ],
  },
  {
    label: "Analytics",
    items: [{ to: "/analytics", label: "Vendor Performance", icon: BarChart3 }],
  },
  {
    label: "AI Intelligence",
    items: [{ to: "/ai-assistant", label: "KSRTC SCION", imgSrc: "/scion-logo.png" }],
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

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-[--color-border] bg-[--color-surface-0] transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? "w-64 translate-x-0 shadow-2xl" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-16" : "lg:w-64"}`}
      >
        <div className={`flex items-center border-b border-[--color-border] py-4 transition-all ${
          isCollapsed ? "lg:px-3 lg:justify-center px-5 justify-between" : "px-5 justify-between"
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/ksrtc-app-icon.png"
              alt="KSRTC Logo"
              className="h-8 w-8 rounded-lg border border-[--color-border] object-cover shrink-0"
              title="KSRTC Supply Chain"
            />
            <div className={`${isCollapsed ? "lg:hidden" : "block"} min-w-0 truncate`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[--color-ink-500]">KSRTC</p>
              <p className="text-sm font-semibold text-[--color-ink-900] truncate">Supply Chain</p>
            </div>
          </div>
          <button
            onClick={closeMobile}
            className="rounded p-1 text-[--color-ink-500] hover:bg-[--color-surface-1] lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-4">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-4" : ""}>
              {group.label ? (
                isCollapsed ? (
                  <div className="hidden lg:block my-2 border-t border-[--color-border]/60" />
                ) : (
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-[--color-ink-400]">
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
                        `flex items-center rounded text-sm transition-colors cursor-pointer ${
                          isCollapsed
                            ? "lg:justify-center lg:px-2 lg:py-2 px-2.5 py-1.5 gap-2.5"
                            : "px-2.5 py-1.5 gap-2.5"
                        } ${
                          isActive
                            ? "bg-[--color-forecast-50] font-medium text-[--color-forecast-700]"
                            : "text-[--color-ink-700] hover:bg-[--color-surface-1]"
                        }`
                      }
                    >
                      {item.imgSrc ? (
                        <img src={item.imgSrc} alt={item.label} className="h-4 w-4 object-contain shrink-0" />
                      ) : (
                        <item.icon size={16} className="shrink-0" />
                      )}
                      <span className={`${isCollapsed ? "lg:hidden" : "inline"} truncate`}>
                        {item.label}
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-[--color-border] p-2.5 space-y-1">
          <NavLink
            to="/settings/integrations"
            onClick={closeMobile}
            title={isCollapsed ? "Settings" : undefined}
            className={({ isActive }) =>
              `flex items-center rounded text-sm transition-colors cursor-pointer ${
                isCollapsed
                  ? "lg:justify-center lg:px-2 lg:py-2 px-2.5 py-1.5 gap-2.5"
                  : "px-2.5 py-1.5 gap-2.5"
              } ${
                isActive
                  ? "bg-[--color-forecast-50] font-medium text-[--color-forecast-700]"
                  : "text-[--color-ink-700] hover:bg-[--color-surface-1]"
              }`
            }
          >
            <SettingsIcon size={16} className="shrink-0" />
            <span className={`${isCollapsed ? "lg:hidden" : "inline"} truncate`}>Settings</span>
          </NavLink>

          {/* Desktop Collapse / Expand Toggle */}
          <button
            onClick={toggleCollapsed}
            className={`hidden lg:flex items-center rounded py-1.5 text-xs text-[--color-ink-500] hover:text-[--color-ink-900] hover:bg-[--color-surface-1] transition-colors cursor-pointer w-full ${
              isCollapsed ? "justify-center px-2" : "justify-start px-2.5 gap-2"
            }`}
            title={isCollapsed ? "Expand sidebar (give more navigation context)" : "Collapse sidebar (more workspace for tables & boards)"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <>
                <PanelLeftClose size={16} />
                <span className="text-[11px] font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
