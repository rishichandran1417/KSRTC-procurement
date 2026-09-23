import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto bg-[--color-surface-1]">
        <Outlet />
      </main>
    </div>
  );
}
