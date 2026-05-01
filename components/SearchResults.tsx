import { NearbySchoolsList } from "@/components/NearbySchoolsList";
import { SchoolMap } from "@/components/SchoolMap";
import { SchoolProfileCard } from "@/components/SchoolProfileCard";
import { SchoolTypeFilter } from "@/components/SchoolTypeFilter";
import type {
  CommuteResultsBySchoolId,
  Coordinates,
  CoordinatesBySchoolId,
  RadiusMinutes,
  SearchMode,
  School,
  SchoolCounts,
  SchoolFilter
} from "@/types/school";

type SearchResultsProps = {
  activeSchool?: School;
  centerCoordinates?: Coordinates;
  centerSchool?: School;
  commuteError: string | null;
  commuteResults: CommuteResultsBySchoolId;
  counts: SchoolCounts;
  filteredSchools: School[];
  hasSearched: boolean;
  searchMode: SearchMode;
  mapSchools: School[];
  homeAddress: string;
  homeCoordinates?: Coordinates;
  isLoadingCommute: boolean;
  nearbySchools: School[];
  radiusMinutes: RadiusMinutes;
  selectedFilter: SchoolFilter;
  schoolCoordinatesMap: CoordinatesBySchoolId;
  shouldPanToSelectedSchool: boolean;
  onFilterChange: (filter: SchoolFilter) => void;
  onHomeCoordinatesChange: (coordinates?: Coordinates) => void;
  onRadiusMinutesChange: (radiusMinutes: RadiusMinutes) => void;
  onSchoolCoordinatesResolved: (
    schoolId: string,
    coordinates: Coordinates
  ) => void;
  onSelectSchool: (school: School) => void;
};

export function SearchResults({
  activeSchool,
  centerCoordinates,
  centerSchool,
  commuteError,
  commuteResults,
  counts,
  filteredSchools,
  hasSearched,
  searchMode,
  mapSchools,
  homeAddress,
  homeCoordinates,
  isLoadingCommute,
  nearbySchools,
  radiusMinutes,
  selectedFilter,
  schoolCoordinatesMap,
  shouldPanToSelectedSchool,
  onFilterChange,
  onHomeCoordinatesChange,
  onRadiusMinutesChange,
  onSchoolCoordinatesResolved,
  onSelectSchool
}: SearchResultsProps) {
  const schoolNumberMap = Object.fromEntries(
    nearbySchools.map((school, index) => [school.id, index + 1])
  );

  return (
    <div className="space-y-4">
      <SchoolTypeFilter
        selectedFilter={selectedFilter}
        counts={counts}
        onFilterChange={onFilterChange}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <SchoolMap
          centerCoordinates={centerCoordinates}
          centerSchoolId={centerSchool?.id}
          hasSearched={hasSearched}
          homeAddress={homeAddress}
          homeCoordinates={homeCoordinates}
          radiusMinutes={radiusMinutes}
          searchMode={searchMode}
          filteredSchoolIds={new Set(filteredSchools.map((school) => school.id))}
          schoolNumberMap={schoolNumberMap}
          schools={mapSchools}
          schoolCoordinatesMap={schoolCoordinatesMap}
          selectedSchoolId={activeSchool?.id}
          shouldPanToSelectedSchool={shouldPanToSelectedSchool}
          onHomeCoordinatesChange={onHomeCoordinatesChange}
          onRadiusMinutesChange={onRadiusMinutesChange}
          onSchoolCoordinatesResolved={onSchoolCoordinatesResolved}
          onSelectSchool={onSelectSchool}
        />

        <aside className="space-y-4 lg:sticky lg:top-4 lg:flex lg:h-[82vh] lg:max-h-[800px] lg:flex-col lg:overflow-hidden lg:pr-1">
          {commuteError && hasSearched ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {commuteError}
            </div>
          ) : null}

          {activeSchool ? (
            <SchoolProfileCard
              centerCoordinates={centerCoordinates}
              centerSchool={centerSchool}
              commuteResult={commuteResults[activeSchool.id]}
              isSchoolSearchMode={searchMode === "school"}
              isLoadingCommute={hasSearched ? isLoadingCommute : false}
              school={activeSchool}
              isNearest={activeSchool.id === nearbySchools[0]?.id}
              selectedFilter={selectedFilter}
              showCommutePrompt={!hasSearched}
            />
          ) : null}
          <div className="min-h-0 flex-1">
            <NearbySchoolsList
              centerCoordinates={centerCoordinates}
              centerSchool={centerSchool}
              commuteResults={commuteResults}
              homeCoordinates={homeCoordinates}
              isLoadingCommute={isLoadingCommute}
              searchMode={searchMode}
              schoolNumberMap={schoolNumberMap}
              schoolCoordinatesMap={schoolCoordinatesMap}
              schools={nearbySchools}
              selectedSchoolId={activeSchool?.id}
              onSelectSchool={onSelectSchool}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
