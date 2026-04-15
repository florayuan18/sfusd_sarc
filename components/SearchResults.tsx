import { NearbySchoolsList } from "@/components/NearbySchoolsList";
import { SchoolMap } from "@/components/SchoolMap";
import { SchoolProfileCard } from "@/components/SchoolProfileCard";
import { SchoolTypeFilter } from "@/components/SchoolTypeFilter";
import type { School, SchoolCounts, SchoolFilter } from "@/types/school";

type SearchResultsProps = {
  activeSchool?: School;
  counts: SchoolCounts;
  filteredSchools: School[];
  nearbySchools: School[];
  selectedFilter: SchoolFilter;
  onFilterChange: (filter: SchoolFilter) => void;
  onSelectSchool: (school: School) => void;
};

export function SearchResults({
  activeSchool,
  counts,
  filteredSchools,
  nearbySchools,
  selectedFilter,
  onFilterChange,
  onSelectSchool
}: SearchResultsProps) {
  return (
    <div className="space-y-5">
      <SchoolTypeFilter
        selectedFilter={selectedFilter}
        counts={counts}
        onFilterChange={onFilterChange}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
        <SchoolMap
          schools={filteredSchools}
          selectedSchoolId={activeSchool?.id}
          onSelectSchool={onSelectSchool}
        />

        <aside className="space-y-6">
          {activeSchool ? <SchoolProfileCard school={activeSchool} /> : null}
          <NearbySchoolsList
            schools={nearbySchools}
            selectedSchoolId={activeSchool?.id}
            onSelectSchool={onSelectSchool}
          />
        </aside>
      </div>
    </div>
  );
}
