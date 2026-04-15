"use client";

import { useEffect, useRef, useState } from "react";
import { geocodeSchoolAddress } from "@/lib/geocode";
import type { MapStatus } from "@/types/map";
import type { Coordinates, CoordinatesBySchoolId, School } from "@/types/school";

const GEOCODING_CONCURRENCY_LIMIT = 4;

type UseSchoolGeocodingParams = {
  mapStatus: MapStatus;
  schools: School[];
  schoolCoordinatesMap: CoordinatesBySchoolId;
  onSchoolCoordinatesResolved: (
    schoolId: string,
    coordinates: Coordinates
  ) => void;
};

export function useSchoolGeocoding({
  mapStatus,
  schools,
  schoolCoordinatesMap,
  onSchoolCoordinatesResolved
}: UseSchoolGeocodingParams) {
  const geocodingSchoolIdsRef = useRef<Set<string>>(new Set());
  const [geocodingCount, setGeocodingCount] = useState(0);

  useEffect(() => {
    if (mapStatus !== "ready") {
      return;
    }

    const schoolsToGeocode = schools.filter(
      (school) =>
        !schoolCoordinatesMap[school.id] &&
        !geocodingSchoolIdsRef.current.has(school.id)
    );

    if (schoolsToGeocode.length === 0) {
      return;
    }

    let isCancelled = false;
    let cursor = 0;
    let activeRequests = 0;

    setGeocodingCount((count) => count + schoolsToGeocode.length);
    schoolsToGeocode.forEach((school) => {
      geocodingSchoolIdsRef.current.add(school.id);
    });

    function runNext() {
      if (isCancelled) {
        return;
      }

      while (
        activeRequests < GEOCODING_CONCURRENCY_LIMIT &&
        cursor < schoolsToGeocode.length
      ) {
        const school = schoolsToGeocode[cursor];
        cursor += 1;
        activeRequests += 1;

        geocodeSchoolAddress(school)
          .then((coordinates) => {
            if (coordinates && !isCancelled) {
              onSchoolCoordinatesResolved(school.id, coordinates);
            }
          })
          .finally(() => {
            activeRequests -= 1;
            geocodingSchoolIdsRef.current.delete(school.id);

            if (!isCancelled) {
              setGeocodingCount((count) => Math.max(0, count - 1));
              runNext();
            }
          });
      }
    }

    runNext();

    return () => {
      isCancelled = true;
    };
  }, [mapStatus, onSchoolCoordinatesResolved, schoolCoordinatesMap, schools]);

  return geocodingCount;
}
