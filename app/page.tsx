"use client";

import { AddressSearch } from "@/components/AddressSearch";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { SearchResults } from "@/components/SearchResults";
import { useSarcNavigator } from "@/hooks/useSarcNavigator";

export default function Home() {
  const navigator = useSarcNavigator();

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-10">
        <PageHeader
          hasSearched={navigator.hasSearched}
          address={navigator.address}
        />

        <div className="space-y-8">
          <AddressSearch
            address={navigator.address}
            onAddressChange={navigator.setAddress}
            onSearch={navigator.search}
          />

          {!navigator.hasSearched ? (
            <EmptyState />
          ) : (
            <SearchResults
              activeSchool={navigator.activeSchool}
              counts={navigator.counts}
              filteredSchools={navigator.filteredSchools}
              homeAddress={navigator.address}
              homeCoordinates={navigator.homeCoordinates}
              nearbySchools={navigator.nearbySchools}
              radiusMinutes={navigator.radiusMinutes}
              selectedFilter={navigator.selectedFilter}
              schoolCoordinatesMap={navigator.schoolCoordinatesMap}
              onFilterChange={navigator.selectFilter}
              onHomeCoordinatesChange={navigator.setHomeCoordinates}
              onRadiusMinutesChange={navigator.setRadiusMinutes}
              onSchoolCoordinatesResolved={navigator.saveSchoolCoordinates}
              onSelectSchool={navigator.selectSchool}
            />
          )}
        </div>
      </div>
    </main>
  );
}
