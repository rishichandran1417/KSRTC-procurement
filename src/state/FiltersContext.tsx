import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { GlobalFilters, Horizon } from "../types";
import { CATEGORIES } from "../constants";

export const SINGLE_DEPOT_NAME = "KSRTC Central Stores";
export const ALL_CATEGORIES_LABEL = "All Categories";

const DEFAULT_FILTERS: GlobalFilters = {
  category: ALL_CATEGORIES_LABEL,
  startDate: "2026-04-01",
  endDate: "2026-09-30",
  horizon: 3,
};

interface FiltersContextValue {
  filters: GlobalFilters;
  setCategory: (category: string) => void;
  setDateRange: (startDate: string, endDate: string) => void;
  setHorizon: (horizon: Horizon) => void;
  categoryOptions: string[];
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<GlobalFilters>(DEFAULT_FILTERS);

  const value = useMemo<FiltersContextValue>(
    () => ({
      filters,
      setCategory: (category) => setFilters((f) => ({ ...f, category })),
      setDateRange: (startDate, endDate) => setFilters((f) => ({ ...f, startDate, endDate })),
      setHorizon: (horizon) => setFilters((f) => ({ ...f, horizon })),
      categoryOptions: [ALL_CATEGORIES_LABEL, ...CATEGORIES],
    }),
    [filters]
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
}
