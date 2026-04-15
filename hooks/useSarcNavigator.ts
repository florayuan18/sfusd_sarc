"use client";

import { useCallback, useMemo, useState } from "react";
import { sfusdSchools } from "@/data/sfusd_schools";
import {
  getFilteredSchools,
  getInitialSchoolForFilter,
  getSchoolCounts,
  normalizeSchools
} from "@/lib/schoolUtils";
import type {
  Coordinates,
  CoordinatesBySchoolId,
  RadiusMinutes,
  School,
  SchoolFilter
} from "@/types/school";

const MAX_NEARBY_SCHOOLS = 5;
const allSchools = normalizeSchools(sfusdSchools);

export function useSarcNavigator() {
  const [address, setAddress] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SchoolFilter>("all");
  const [selectedSchool, setSelectedSchool] = useState<School | undefined>();
  const [homeCoordinates, setHomeCoordinates] = useState<Coordinates>();
  const [radiusMinutes, setRadiusMinutes] = useState<RadiusMinutes>(20);
  const [schoolCoordinatesMap, setSchoolCoordinatesMap] =
    useState<CoordinatesBySchoolId>({});

  const counts = useMemo(() => getSchoolCounts(allSchools), []);
  const filteredSchools = useMemo(
    () => getFilteredSchools(allSchools, selectedFilter),
    [selectedFilter]
  );
  const nearbySchools = filteredSchools.slice(0, MAX_NEARBY_SCHOOLS);
  const activeSchool = selectedSchool ?? nearbySchools[0];

  const search = useCallback(() => {
    setHasSearched(true);
    setSelectedFilter("all");
    setSelectedSchool(allSchools[0]);
    setHomeCoordinates(undefined);
  }, []);

  const selectFilter = useCallback((filter: SchoolFilter) => {
    setSelectedFilter(filter);
    setSelectedSchool(getInitialSchoolForFilter(allSchools, filter));
  }, []);

  const saveSchoolCoordinates = useCallback(
    (schoolId: string, coordinates: Coordinates) => {
      setSchoolCoordinatesMap((currentMap) => {
        if (currentMap[schoolId]) {
          return currentMap;
        }

        return {
          ...currentMap,
          [schoolId]: coordinates
        };
      });
    },
    []
  );

  return {
    activeSchool,
    address,
    counts,
    filteredSchools,
    hasSearched,
    homeCoordinates,
    nearbySchools,
    radiusMinutes,
    schoolCoordinatesMap,
    selectedFilter,
    search,
    saveSchoolCoordinates,
    selectFilter,
    selectSchool: setSelectedSchool,
    setAddress,
    setHomeCoordinates,
    setRadiusMinutes
  };
}
