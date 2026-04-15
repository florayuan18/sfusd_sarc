import { SCHOOL_FILTER_LABELS, SCHOOL_FILTERS } from "@/lib/schoolUtils";
import { cn } from "@/lib/classNames";
import type { SchoolCounts, SchoolFilter } from "@/types/school";

type SchoolTypeFilterProps = {
  selectedFilter: SchoolFilter;
  counts: SchoolCounts;
  onFilterChange: (filter: SchoolFilter) => void;
};

export function SchoolTypeFilter({
  selectedFilter,
  counts,
  onFilterChange
}: SchoolTypeFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {SCHOOL_FILTERS.map((filter) => {
        const isSelected = selectedFilter === filter;

        return (
          <button
            key={filter}
            type="button"
            onClick={() => onFilterChange(filter)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition",
              isSelected
                ? "bg-accent text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            )}
          >
            {SCHOOL_FILTER_LABELS[filter]}
            <span
              className={cn(
                "ml-2 rounded-full px-2 py-0.5 text-xs",
                isSelected
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-500"
              )}
            >
              {counts[filter]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
