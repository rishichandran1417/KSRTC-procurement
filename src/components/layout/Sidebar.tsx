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
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? "w-64 translate-x-0 shadow-xl" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-16" : "lg:w-64"}`}
      >
        <div className={`flex items-center border-b border-slate-200 dark:border-zinc-800 py-3.5 transition-all ${
          isCollapsed ? "lg:px-3 lg:justify-center px-5 justify-between" : "px-5 justify-between"
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/ksrtc-app-icon.png"
              alt="KSRTC Logo"
              className="h-7 w-7 rounded border border-slate-200 dark:border-zinc-700 object-cover shrink-0"
              title="KSRTC Supply Chain"
            />
            <div className={`${isCollapsed ? "lg:hidden" : "block"} min-w-0 truncate`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">KSRTC</p>
              <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">Supply Chain</p>
            </div>
          </div>
          <button
            onClick={closeMobile}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label ? (
                isCollapsed ? (
                  <div className="hidden lg:block my-2 border-t border-slate-200 dark:border-zinc-800" />
                ) : (
                  <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
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
                        `flex items-center rounded text-xs transition-colors cursor-pointer ${
                          isCollapsed
                            ? "lg:justify-center lg:px-2 lg:py-2 px-2.5 py-1.5 gap-2.5"
                            : "px-2.5 py-1.5 gap-2.5"
                        } ${
                          isActive
                            ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-50 font-semibold border-l-2 border-l-blue-600"
                            : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200 font-medium"
                        }`
                      }
                    >
                      {item.imgSrc ? (
                        <img src={item.imgSrc} alt={item.label} className="h-4 w-4 object-contain shrink-0" />
                      ) : (
                        <item.icon size={15} className="shrink-0" />
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

        <div className="border-t border-slate-200 dark:border-zinc-800 p-2 space-y-0.5">
          <NavLink
            to="/settings/integrations"
            onClick={closeMobile}
            title={isCollapsed ? "Settings" : undefined}
            className={({ isActive }) =>
              `flex items-center rounded text-xs transition-colors cursor-pointer ${
                isCollapsed
                  ? "lg:justify-center lg:px-2 lg:py-2 px-2.5 py-1.5 gap-2.5"
                  : "px-2.5 py-1.5 gap-2.5"
              } ${
                isActive
                  ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-50 font-semibold border-l-2 border-l-blue-600"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-200 font-medium"
              }`
            }
          >
            <SettingsIcon size={15} className="shrink-0" />
            <span className={`${isCollapsed ? "lg:hidden" : "inline"} truncate`}>Settings</span>
          </NavLink>

          {/* Desktop Collapse / Expand Toggle */}
          <button
            onClick={toggleCollapsed}
            className={`hidden lg:flex items-center rounded py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer w-full ${
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
                <span className="text-[11px] font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
