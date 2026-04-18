"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  SCHOOL_MARKER_Z_INDEX,
  SELECTED_SCHOOL_MARKER_Z_INDEX
} from "@/lib/mapConfig";
import { getSchoolMarkerIcon } from "@/lib/mapMarkers";
import { isSchoolWithinRadius } from "@/lib/schoolUtils";
import type { MapStatus } from "@/types/map";
import type { Coordinates, CoordinatesBySchoolId, School } from "@/types/school";

type UseSchoolMarkersParams = {
  filteredSchoolIds: Set<string>;
  homeCoordinates?: Coordinates;
  infoWindowRef: React.MutableRefObject<google.maps.InfoWindow | undefined>;
  mapRef: React.MutableRefObject<google.maps.Map | undefined>;
  mapStatus: MapStatus;
  radiusMeters: number;
  schoolNumberMap: Record<string, number>;
  schoolCoordinatesMap: CoordinatesBySchoolId;
  schools: School[];
  selectedSchoolId?: string;
  shouldPanToSelectedSchool: boolean;
  onSelectSchool: (school: School) => void;
};

export function useSchoolMarkers({
  filteredSchoolIds,
  homeCoordinates,
  infoWindowRef,
  mapRef,
  mapStatus,
  radiusMeters,
  schoolNumberMap,
  schoolCoordinatesMap,
  schools,
  selectedSchoolId,
  shouldPanToSelectedSchool,
  onSelectSchool
}: UseSchoolMarkersParams) {
  const schoolMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  const openSchoolInfoWindow = (
    infoWindow: google.maps.InfoWindow,
    marker: google.maps.Marker,
    map: google.maps.Map,
    school: School,
    schoolNumber?: number
  ) => {
    infoWindow.setContent(
      `<div style="font-weight:600;color:#111827;">${schoolNumber ? `${schoolNumber}. ` : ""}${school.name}</div>`
    );
    infoWindow.open({
      anchor: marker,
      map
    });
  };

  const resolvedMarkerCount = useMemo(
    () => schools.filter((school) => schoolCoordinatesMap[school.id]).length,
    [schoolCoordinatesMap, schools]
  );

  useEffect(() => {
    if (mapStatus !== "ready") {
      return;
    }

    const google = window.google;
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;

    if (!map || !infoWindow) {
      return;
    }

    const markerMap = schoolMarkersRef.current;

    markerMap.forEach((marker) => marker.setMap(null));
    markerMap.clear();

    schools.forEach((school) => {
      const coordinates = schoolCoordinatesMap[school.id];

      if (!coordinates) {
        return;
      }

      if (!filteredSchoolIds.has(school.id)) {
        return;
      }

      const isSelected = selectedSchoolId === school.id;
      const isWithinRadius = isSchoolWithinRadius({
        homeCoordinates,
        radiusMeters,
        schoolCoordinates: coordinates
      });

      if (!isWithinRadius) {
        return;
      }

      const marker = new google.maps.Marker({
        map,
        position: coordinates,
        title: school.name,
        zIndex: isSelected
          ? SELECTED_SCHOOL_MARKER_Z_INDEX
          : SCHOOL_MARKER_Z_INDEX,
        icon: getSchoolMarkerIcon(google, {
          schoolType: school.type,
          isSelected,
          isWithinRadius
        }),
        label: {
          text: String(schoolNumberMap[school.id] ?? ""),
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: "700"
        }
      });

      marker.addListener("click", () => {
        onSelectSchool(school);
        openSchoolInfoWindow(
          infoWindow,
          marker,
          map,
          school,
          schoolNumberMap[school.id]
        );
      });
      marker.addListener("mouseover", () => {
        infoWindow.setContent(
          `<div style="font-weight:600;color:#111827;">${schoolNumberMap[school.id] ? `${schoolNumberMap[school.id]}. ` : ""}${school.name}</div><div style="margin-top:4px;font-size:12px;color:#475569;">Within radius</div>`
        );
        infoWindow.open({
          anchor: marker,
          map
        });
      });
      marker.addListener("mouseout", () => infoWindow.close());

      markerMap.set(school.id, marker);
    });

    return () => {
      markerMap.forEach((marker) => marker.setMap(null));
      markerMap.clear();
    };
  }, [
    filteredSchoolIds,
    homeCoordinates,
    infoWindowRef,
    mapRef,
    mapStatus,
    onSelectSchool,
    radiusMeters,
    schoolNumberMap,
    schoolCoordinatesMap,
    schools,
    selectedSchoolId
  ]);

  useEffect(() => {
    if (
      mapStatus !== "ready" ||
      !selectedSchoolId ||
      !shouldPanToSelectedSchool
    ) {
      return;
    }

    const selectedCoordinates = schoolCoordinatesMap[selectedSchoolId];
    const selectedMarker = schoolMarkersRef.current.get(selectedSchoolId);
    const selectedSchool = schools.find((school) => school.id === selectedSchoolId);

    if (selectedCoordinates) {
      mapRef.current?.panTo(selectedCoordinates);
    }

    if (
      selectedMarker &&
      selectedSchool &&
      infoWindowRef.current &&
      mapRef.current
    ) {
      openSchoolInfoWindow(
        infoWindowRef.current,
        selectedMarker,
        mapRef.current,
        selectedSchool,
        schoolNumberMap[selectedSchoolId]
      );
    }
  }, [
    infoWindowRef,
    mapRef,
    mapStatus,
    schoolNumberMap,
    schoolCoordinatesMap,
    schools,
    selectedSchoolId,
    shouldPanToSelectedSchool
  ]);

  return resolvedMarkerCount;
}
