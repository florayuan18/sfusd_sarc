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
      <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8 lg:py-6">
        <PageHeader
          hasSearched={navigator.hasSearched}
          address={navigator.address}
        />

        <div className="space-y-6">
          <AddressSearch
            address={navigator.address}
            onAddressChange={navigator.setAddress}
            onAddressSelect={navigator.selectAddressSuggestion}
            onSearch={navigator.search}
            onUseCurrentLocation={navigator.submitCurrentLocation}
          />

          {!navigator.hasSearched ? (
            <EmptyState />
          ) : (
            <SearchResults
              activeSchool={navigator.activeSchool}
              commuteError={navigator.commuteError}
              commuteResults={navigator.commuteResults}
              counts={navigator.counts}
              filteredSchools={navigator.filteredSchools}
              mapSchools={navigator.allSchools}
              homeAddress={navigator.submittedAddress}
              homeCoordinates={navigator.homeCoordinates}
              isLoadingCommute={navigator.isLoadingCommute}
              nearbySchools={navigator.nearbySchools}
              radiusMinutes={navigator.radiusMinutes}
              selectedFilter={navigator.selectedFilter}
              schoolCoordinatesMap={navigator.schoolCoordinatesMap}
              shouldPanToSelectedSchool={navigator.shouldPanToSelectedSchool}
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
