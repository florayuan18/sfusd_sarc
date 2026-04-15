"use client";

import { useMemo, useState } from "react";
import { AddressSearch } from "@/components/AddressSearch";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { SearchResults } from "@/components/SearchResults";
import { schools } from "@/data/schools";
import {
  getFilteredSchools,
  getInitialSchoolForFilter,
  getSchoolCounts
} from "@/lib/school-utils";
import type { School, SchoolFilter } from "@/types/school";

const MAX_NEARBY_SCHOOLS = 5;

export default function Home() {
  const [address, setAddress] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SchoolFilter>("All");
  const [selectedSchool, setSelectedSchool] = useState<School | undefined>();

  const counts = useMemo(() => getSchoolCounts(schools), []);
  const filteredSchools = useMemo(
    () => getFilteredSchools(schools, selectedFilter),
    [selectedFilter]
  );
  const visibleNearbySchools = filteredSchools.slice(0, MAX_NEARBY_SCHOOLS);
  const activeSchool = selectedSchool ?? visibleNearbySchools[0];

  function handleSearch() {
    setHasSearched(true);
    setSelectedFilter("All");
    setSelectedSchool(schools[0]);
  }

  function handleFilterChange(filter: SchoolFilter) {
    setSelectedFilter(filter);
    setSelectedSchool(getInitialSchoolForFilter(schools, filter));
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-10">
        <PageHeader hasSearched={hasSearched} address={address} />

        <div className="space-y-8">
          <AddressSearch
            address={address}
            onAddressChange={setAddress}
            onSearch={handleSearch}
          />

          {!hasSearched ? (
            <EmptyState />
          ) : (
            <SearchResults
              activeSchool={activeSchool}
              counts={counts}
              filteredSchools={filteredSchools}
              nearbySchools={visibleNearbySchools}
              selectedFilter={selectedFilter}
              onFilterChange={handleFilterChange}
              onSelectSchool={setSelectedSchool}
            />
          )}
        </div>
      </div>
    </main>
  );
}
