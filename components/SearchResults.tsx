import { NearbySchoolsList } from "@/components/NearbySchoolsList";
import { SchoolMap } from "@/components/SchoolMap";
import { SchoolProfileCard } from "@/components/SchoolProfileCard";
import { SchoolTypeFilter } from "@/components/SchoolTypeFilter";
import type {
  CommuteResultsBySchoolId,
  Coordinates,
  CoordinatesBySchoolId,
  RadiusMinutes,
  School,
  SchoolCounts,
  SchoolFilter
} from "@/types/school";

type SearchResultsProps = {
  activeSchool?: School;
  commuteError: string | null;
  commuteResults: CommuteResultsBySchoolId;
  counts: SchoolCounts;
  filteredSchools: School[];
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
  commuteError,
  commuteResults,
  counts,
  filteredSchools,
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
          homeAddress={homeAddress}
          homeCoordinates={homeCoordinates}
          radiusMinutes={radiusMinutes}
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

        <aside className="space-y-5 lg:sticky lg:top-4 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
          {commuteError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {commuteError}
            </div>
          ) : null}

          {activeSchool ? (
            <SchoolProfileCard
              commuteResult={commuteResults[activeSchool.id]}
              isLoadingCommute={isLoadingCommute}
              school={activeSchool}
              isNearest={activeSchool.id === nearbySchools[0]?.id}
              selectedFilter={selectedFilter}
            />
          ) : null}
          <NearbySchoolsList
            commuteResults={commuteResults}
            homeCoordinates={homeCoordinates}
            isLoadingCommute={isLoadingCommute}
            schoolNumberMap={schoolNumberMap}
            schoolCoordinatesMap={schoolCoordinatesMap}
            schools={nearbySchools}
            selectedSchoolId={activeSchool?.id}
            onSelectSchool={onSelectSchool}
          />
        </aside>
      </div>
    </div>
  );
}
