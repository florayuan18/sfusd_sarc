"use client";

import { useEffect, useRef, useState } from "react";
import type { School } from "@/types/school";
import { cn } from "@/lib/classNames";
import { SCHOOL_TYPE_LABELS } from "@/lib/schoolUtils";

type SchoolSearchProps = {
  isDropdownOpen: boolean;
  onDropdownOpenChange: (isOpen: boolean) => void;
  onQueryChange: (value: string) => void;
  onSelectSchool: (school: School) => void;
  query: string;
  selectedSchool?: School;
  suggestions: School[];
};

export function SchoolSearch({
  isDropdownOpen,
  onDropdownOpenChange,
  onQueryChange,
  onSelectSchool,
  query,
  selectedSchool,
  suggestions
}: SchoolSearchProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, suggestions]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onDropdownOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onDropdownOpenChange]);

  const hasSuggestions = suggestions.length > 0;
  const shouldShowDropdown =
    isDropdownOpen && query.trim().length > 0 && hasSuggestions;

  return (
    <div ref={containerRef} className="relative border-t border-slate-200 pt-5">
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-950">
          Have a school in mind?
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Search for a school, then compare nearby options around it.
        </p>
      </div>

      <label className="block">
        <span className="sr-only">Search by school name</span>
        <input
          type="text"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
            onDropdownOpenChange(true);
          }}
          onFocus={() => {
            if (query.trim().length > 0) {
              onDropdownOpenChange(true);
            }
          }}
          onKeyDown={(event) => {
            if (!hasSuggestions) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              onDropdownOpenChange(true);
              setHighlightedIndex((current) =>
                current === suggestions.length - 1 ? 0 : current + 1
              );
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              onDropdownOpenChange(true);
              setHighlightedIndex((current) =>
                current === 0 ? suggestions.length - 1 : current - 1
              );
            }

            if (event.key === "Enter" && isDropdownOpen) {
              event.preventDefault();
              const school = suggestions[highlightedIndex];

              if (school) {
                onSelectSchool(school);
              }
            }

            if (event.key === "Escape") {
              onDropdownOpenChange(false);
            }
          }}
          placeholder="Search by school name"
          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-accent focus:ring-4 focus:ring-blue-100"
        />
      </label>

      {shouldShowDropdown ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <ul className="max-h-72 overflow-y-auto py-2">
            {suggestions.map((school, index) => {
              const isHighlighted = index === highlightedIndex;

              return (
                <li key={school.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSelectSchool(school);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition",
                      isHighlighted ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="font-medium text-slate-950">
                      {school.name}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {SCHOOL_TYPE_LABELS[school.type]}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
