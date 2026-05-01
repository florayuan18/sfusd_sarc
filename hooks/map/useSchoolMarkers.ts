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
  centerCoordinates?: Coordinates;
  centerSchoolId?: string;
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
  centerCoordinates,
  centerSchoolId,
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
  const visibleSchoolCoordinates = useMemo(
    () =>
      schools
        .filter((school) => {
          const coordinates = schoolCoordinatesMap[school.id];

          if (!coordinates) {
            return false;
          }

          const isSelected = selectedSchoolId === school.id;
          const isCenterSchool = centerSchoolId === school.id;
          const matchesFilter = filteredSchoolIds.has(school.id);

          if (!matchesFilter && !isSelected && !isCenterSchool) {
            return false;
          }

          return (
            isSelected ||
            isCenterSchool ||
            isSchoolWithinRadius({
              homeCoordinates: centerCoordinates ?? homeCoordinates,
              radiusMeters,
              schoolCoordinates: coordinates
            })
          );
        })
        .map((school) => schoolCoordinatesMap[school.id]),
    [
      centerCoordinates,
      filteredSchoolIds,
      homeCoordinates,
      radiusMeters,
      schoolCoordinatesMap,
      schools,
      selectedSchoolId
    ]
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
      const isCenterSchool = centerSchoolId === school.id;
      const matchesFilter = filteredSchoolIds.has(school.id);

      if (!matchesFilter && !isSelected && !isCenterSchool) {
        return;
      }

      const isWithinRadius = isSchoolWithinRadius({
        homeCoordinates: centerCoordinates ?? homeCoordinates,
        radiusMeters,
        schoolCoordinates: coordinates
      });

      if (!isWithinRadius && !isSelected && !isCenterSchool) {
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
          isSelected: isSelected || isCenterSchool,
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
          `<div style="font-weight:600;color:#111827;">${schoolNumberMap[school.id] ? `${schoolNumberMap[school.id]}. ` : ""}${school.name}</div><div style="margin-top:4px;font-size:12px;color:#475569;">${isWithinRadius ? "Within radius" : "Outside current radius"}</div>`
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
    centerCoordinates,
    centerSchoolId,
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

  useEffect(() => {
    if (
      mapStatus !== "ready" ||
      !(centerCoordinates ?? homeCoordinates) ||
      !mapRef.current ||
      shouldPanToSelectedSchool
    ) {
      return;
    }

    const google = window.google;
    const bounds = new google.maps.LatLngBounds();

    bounds.extend(centerCoordinates ?? homeCoordinates!);

    visibleSchoolCoordinates.forEach((coordinates) => {
      if (coordinates) {
        bounds.extend(coordinates);
      }
    });

    if (visibleSchoolCoordinates.length === 0) {
      mapRef.current.setCenter(centerCoordinates ?? homeCoordinates!);
      mapRef.current.setZoom(14);
      return;
    }

    mapRef.current.fitBounds(bounds, {
      top: 72,
      right: 72,
      bottom: 72,
      left: 72
    });
  }, [
    centerCoordinates,
    homeCoordinates,
    mapRef,
    mapStatus,
    shouldPanToSelectedSchool,
    visibleSchoolCoordinates
  ]);

  return resolvedMarkerCount;
}
