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
  homeAddress: string;
  homeCoordinates?: Coordinates;
  isLoadingCommute: boolean;
  nearbySchools: School[];
  radiusMinutes: RadiusMinutes;
  selectedFilter: SchoolFilter;
  schoolCoordinatesMap: CoordinatesBySchoolId;
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
  homeAddress,
  homeCoordinates,
  isLoadingCommute,
  nearbySchools,
  radiusMinutes,
  selectedFilter,
  schoolCoordinatesMap,
  onFilterChange,
  onHomeCoordinatesChange,
  onRadiusMinutesChange,
  onSchoolCoordinatesResolved,
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
          homeAddress={homeAddress}
          homeCoordinates={homeCoordinates}
          radiusMinutes={radiusMinutes}
          schools={filteredSchools}
          schoolCoordinatesMap={schoolCoordinatesMap}
          selectedSchoolId={activeSchool?.id}
          onHomeCoordinatesChange={onHomeCoordinatesChange}
          onRadiusMinutesChange={onRadiusMinutesChange}
          onSchoolCoordinatesResolved={onSchoolCoordinatesResolved}
          onSelectSchool={onSelectSchool}
        />

        <aside className="space-y-6">
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
            isLoadingCommute={isLoadingCommute}
            schools={nearbySchools}
            selectedSchoolId={activeSchool?.id}
            onSelectSchool={onSelectSchool}
          />
        </aside>
      </div>
    </div>
  );
}
