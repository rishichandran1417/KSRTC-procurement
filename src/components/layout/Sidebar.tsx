import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, Calculator, Boxes, ClipboardList,
  Truck, BarChart3, Settings as SettingsIcon,
} from "lucide-react";

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
  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-[--color-border] bg-[--color-surface-0]">
      <div className="flex items-center gap-3 border-b border-[--color-border] px-5 py-4">
        <img src="/ksrtc-app-icon.png" alt="KSRTC Logo" className="h-8 w-8 rounded-lg border border-[--color-border] object-cover" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[--color-ink-500]">KSRTC</p>
          <p className="text-sm font-semibold text-[--color-ink-900]">Supply Chain Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-5" : ""}>
            {group.label ? (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-[--color-ink-400]">
                {group.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded px-2.5 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "bg-[--color-forecast-50] font-medium text-[--color-forecast-700]"
                          : "text-[--color-ink-700] hover:bg-[--color-surface-1]"
                      }`
                    }
                  >
                    {item.imgSrc ? (
                      <img src={item.imgSrc} alt={item.label} className="h-4 w-4 object-contain shrink-0" />
                    ) : (
                      <item.icon size={16} />
                    )}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[--color-border] px-3 py-3">
        <NavLink
          to="/settings/integrations"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded px-2.5 py-1.5 text-sm ${
              isActive
                ? "bg-[--color-forecast-50] font-medium text-[--color-forecast-700]"
                : "text-[--color-ink-700] hover:bg-[--color-surface-1]"
            }`
          }
        >
          <SettingsIcon size={16} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
