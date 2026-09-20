import { useFilters } from "../../state/FiltersContext";
import type { Horizon } from "../../types";

const HORIZONS: Horizon[] = [1, 3, 6, 9, 12];

export function TopBar({
  title,
  subtitle,
  showFilters = true,
}: {
  title: string;
  subtitle?: string;
  showFilters?: boolean;
}) {
  const { filters, setCategory, setDateRange, setHorizon, categoryOptions } = useFilters();

  return (
    <div className="border-b border-[--color-border] bg-[--color-surface-0] px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[--color-ink-900]">{title}</h1>
          {subtitle ? <p className="text-sm text-[--color-ink-500]">{subtitle}</p> : null}
        </div>
      </div>

      {showFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={filters.category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-sm text-[--color-ink-700]"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setDateRange(e.target.value, filters.endDate)}
            className="rounded border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-sm text-[--color-ink-700]"
          />
          <span className="text-sm text-[--color-ink-400]">to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setDateRange(filters.startDate, e.target.value)}
            className="rounded border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-sm text-[--color-ink-700]"
          />

          <select
            value={filters.horizon}
            onChange={(e) => setHorizon(Number(e.target.value) as Horizon)}
            className="rounded border border-[--color-border] bg-[--color-surface-0] px-2.5 py-1.5 text-sm text-[--color-ink-700]"
          >
            {HORIZONS.map((h) => (
              <option key={h} value={h}>{h}-month horizon</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
