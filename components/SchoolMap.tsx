"use client";

import { MapOverlay } from "@/components/map/MapOverlay";
import { MapStatusBadge } from "@/components/map/MapStatusBadge";
import { RadiusControl } from "@/components/map/RadiusControl";
import { useGoogleMap } from "@/hooks/map/useGoogleMap";
import { useHomeGeocoding } from "@/hooks/map/useHomeGeocoding";
import { useHomeMarker } from "@/hooks/map/useHomeMarker";
import { useSchoolGeocoding } from "@/hooks/map/useSchoolGeocoding";
import { useSchoolMarkers } from "@/hooks/map/useSchoolMarkers";
import { RADIUS_METERS_BY_MINUTES } from "@/lib/mapConfig";
import type {
  Coordinates,
  CoordinatesBySchoolId,
  RadiusMinutes,
  SearchMode,
  School
} from "@/types/school";

type SchoolMapProps = {
  centerCoordinates?: Coordinates;
  centerSchoolId?: string;
  hasSearched: boolean;
  homeAddress: string;
  homeCoordinates?: Coordinates;
  filteredSchoolIds: Set<string>;
  radiusMinutes: RadiusMinutes;
  searchMode?: SearchMode;
  schoolNumberMap: Record<string, number>;
  schools: School[];
  schoolCoordinatesMap: CoordinatesBySchoolId;
  selectedSchoolId?: string;
  shouldPanToSelectedSchool: boolean;
  onHomeCoordinatesChange: (coordinates?: Coordinates) => void;
  onRadiusMinutesChange: (radiusMinutes: RadiusMinutes) => void;
  onSchoolCoordinatesResolved: (
    schoolId: string,
    coordinates: Coordinates
  ) => void;
  onSelectSchool: (school: School) => void;
};

export function SchoolMap({
  centerCoordinates,
  centerSchoolId,
  hasSearched,
  homeAddress,
  homeCoordinates,
  filteredSchoolIds,
  radiusMinutes,
  searchMode = "address",
  schoolNumberMap,
  schools,
  schoolCoordinatesMap,
  selectedSchoolId,
  shouldPanToSelectedSchool,
  onHomeCoordinatesChange,
  onRadiusMinutesChange,
  onSchoolCoordinatesResolved,
  onSelectSchool
}: SchoolMapProps) {
  const { infoWindowRef, mapContainerRef, mapRef, mapStatus } = useGoogleMap();
  const homeGeocodeStatus = useHomeGeocoding({
    hasSearched,
    homeAddress,
    homeCoordinates,
    mapRef,
    mapStatus,
    onHomeCoordinatesChange
  });
  const geocodingCount = useSchoolGeocoding({
    mapStatus,
    schools,
    schoolCoordinatesMap,
    onSchoolCoordinatesResolved
  });
  const resolvedMarkerCount = useSchoolMarkers({
    centerCoordinates,
    centerSchoolId,
    filteredSchoolIds,
    homeCoordinates,
    infoWindowRef,
    mapRef,
    mapStatus,
    radiusMeters: RADIUS_METERS_BY_MINUTES[radiusMinutes],
    schoolNumberMap,
    schools,
    schoolCoordinatesMap,
    selectedSchoolId,
    shouldPanToSelectedSchool,
    onSelectSchool
  });

  useHomeMarker({
    circleCenterCoordinates:
      searchMode === "school" && centerCoordinates
        ? centerCoordinates
        : homeCoordinates,
    homeCoordinates,
    mapRef,
    mapStatus,
    radiusMinutes
  });

  return (
    <section className="relative h-[620px] min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-soft lg:h-[82vh] lg:max-h-[800px] lg:min-h-[640px]">
      <div ref={mapContainerRef} className="absolute inset-0" />

      {mapStatus !== "ready" ? (
        <MapOverlay status={mapStatus} />
      ) : (
        <>
          <div className="absolute left-6 top-6 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            Map
          </div>

          <RadiusControl
            value={radiusMinutes}
            onChange={onRadiusMinutesChange}
          />
          <MapStatusBadge
            geocodingCount={geocodingCount}
            homeGeocodeStatus={homeGeocodeStatus}
            resolvedMarkerCount={resolvedMarkerCount}
          />
        </>
      )}
    </section>
  );
}
