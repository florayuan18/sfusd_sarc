"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  SCHOOL_MARKER_Z_INDEX,
  SELECTED_SCHOOL_MARKER_Z_INDEX
} from "@/lib/mapConfig";
import { getSchoolMarkerIcon } from "@/lib/mapMarkers";
import type { MapStatus } from "@/types/map";
import type { CoordinatesBySchoolId, School } from "@/types/school";

type UseSchoolMarkersParams = {
  infoWindowRef: React.MutableRefObject<google.maps.InfoWindow | undefined>;
  mapRef: React.MutableRefObject<google.maps.Map | undefined>;
  mapStatus: MapStatus;
  schoolCoordinatesMap: CoordinatesBySchoolId;
  schools: School[];
  selectedSchoolId?: string;
  onSelectSchool: (school: School) => void;
};

export function useSchoolMarkers({
  infoWindowRef,
  mapRef,
  mapStatus,
  schoolCoordinatesMap,
  schools,
  selectedSchoolId,
  onSelectSchool
}: UseSchoolMarkersParams) {
  const schoolMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());

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

      const isSelected = selectedSchoolId === school.id;
      const marker = new google.maps.Marker({
        map,
        position: coordinates,
        title: school.name,
        zIndex: isSelected
          ? SELECTED_SCHOOL_MARKER_Z_INDEX
          : SCHOOL_MARKER_Z_INDEX,
        icon: getSchoolMarkerIcon(google, isSelected)
      });

      marker.addListener("click", () => onSelectSchool(school));
      marker.addListener("mouseover", () => {
        infoWindow.setContent(
          `<div style="font-weight:600;color:#111827;">${school.name}</div>`
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
    infoWindowRef,
    mapRef,
    mapStatus,
    onSelectSchool,
    schoolCoordinatesMap,
    schools,
    selectedSchoolId
  ]);

  useEffect(() => {
    if (mapStatus !== "ready" || !selectedSchoolId) {
      return;
    }

    const selectedCoordinates = schoolCoordinatesMap[selectedSchoolId];

    if (selectedCoordinates) {
      mapRef.current?.panTo(selectedCoordinates);
    }
  }, [mapRef, mapStatus, schoolCoordinatesMap, selectedSchoolId]);

  return resolvedMarkerCount;
}
