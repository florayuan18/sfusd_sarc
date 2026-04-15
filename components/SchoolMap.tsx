"use client";

import { MapOverlay } from "@/components/map/MapOverlay";
import { MapStatusBadge } from "@/components/map/MapStatusBadge";
import { RadiusControl } from "@/components/map/RadiusControl";
import { useGoogleMap } from "@/hooks/map/useGoogleMap";
import { useHomeGeocoding } from "@/hooks/map/useHomeGeocoding";
import { useHomeMarker } from "@/hooks/map/useHomeMarker";
import { useSchoolGeocoding } from "@/hooks/map/useSchoolGeocoding";
import { useSchoolMarkers } from "@/hooks/map/useSchoolMarkers";
import type {
  Coordinates,
  CoordinatesBySchoolId,
  RadiusMinutes,
  School
} from "@/types/school";

type SchoolMapProps = {
  homeAddress: string;
  homeCoordinates?: Coordinates;
  radiusMinutes: RadiusMinutes;
  schools: School[];
  schoolCoordinatesMap: CoordinatesBySchoolId;
  selectedSchoolId?: string;
  onHomeCoordinatesChange: (coordinates?: Coordinates) => void;
  onRadiusMinutesChange: (radiusMinutes: RadiusMinutes) => void;
  onSchoolCoordinatesResolved: (
    schoolId: string,
    coordinates: Coordinates
  ) => void;
  onSelectSchool: (school: School) => void;
};

export function SchoolMap({
  homeAddress,
  homeCoordinates,
  radiusMinutes,
  schools,
  schoolCoordinatesMap,
  selectedSchoolId,
  onHomeCoordinatesChange,
  onRadiusMinutesChange,
  onSchoolCoordinatesResolved,
  onSelectSchool
}: SchoolMapProps) {
  const { infoWindowRef, mapContainerRef, mapRef, mapStatus } = useGoogleMap();
  const homeGeocodeStatus = useHomeGeocoding({
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
    infoWindowRef,
    mapRef,
    mapStatus,
    schools,
    schoolCoordinatesMap,
    selectedSchoolId,
    onSelectSchool
  });

  useHomeMarker({
    homeCoordinates,
    mapRef,
    mapStatus,
    radiusMinutes
  });

  return (
    <section className="relative min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-soft">
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
