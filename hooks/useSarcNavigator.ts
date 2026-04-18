"use client";

import { useCallback, useMemo, useState } from "react";
import { useCommuteResults } from "@/hooks/useCommuteResults";
import { sfusdSchools } from "@/data/sfusd_schools";
import { RADIUS_METERS_BY_MINUTES } from "@/lib/mapConfig";
import {
  getFilteredSchools,
  getNearbySchoolsInRadius,
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
const allSchools = normalizeSchools(sfusdSchools);
const initialSchoolCoordinatesMap = allSchools.reduce<CoordinatesBySchoolId>(
  (coordinatesMap, school) => {
    if (!school.coordinates) {
      return coordinatesMap;
    }

    return {
      ...coordinatesMap,
      [school.id]: school.coordinates
    };
  },
  {}
);

export function useSarcNavigator() {
  const [address, setAddress] = useState("");
  const [submittedAddress, setSubmittedAddress] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SchoolFilter>("all");
  const [selectedSchool, setSelectedSchool] = useState<School | undefined>();
  const [shouldPanToSelectedSchool, setShouldPanToSelectedSchool] =
    useState(false);
  const [homeCoordinates, setHomeCoordinates] = useState<Coordinates>();
  const [radiusMinutes, setRadiusMinutes] = useState<RadiusMinutes>(20);
  const [schoolCoordinatesMap, setSchoolCoordinatesMap] =
    useState<CoordinatesBySchoolId>(initialSchoolCoordinatesMap);

  const counts = useMemo(() => getSchoolCounts(allSchools), []);
  const filteredSchools = useMemo(
    () => getFilteredSchools(allSchools, selectedFilter),
    [selectedFilter]
  );
  const { commuteError, commuteResults, isLoadingCommute } = useCommuteResults({
    hasSearched,
    homeCoordinates,
    schoolCoordinatesMap,
    schools: filteredSchools
  });
  const nearbySchools = useMemo(
    () =>
      getNearbySchoolsInRadius({
        homeCoordinates,
        radiusMeters: RADIUS_METERS_BY_MINUTES[radiusMinutes],
        schoolCoordinatesMap,
        schools: filteredSchools
      }),
    [filteredSchools, homeCoordinates, radiusMinutes, schoolCoordinatesMap]
  );
  const activeSchool =
    selectedSchool &&
    nearbySchools.some((school) => school.id === selectedSchool.id)
      ? selectedSchool
      : nearbySchools[0];

  const search = useCallback(() => {
    setHasSearched(true);
    setSubmittedAddress(address);
    setSelectedFilter("all");
    setSelectedSchool(undefined);
    setShouldPanToSelectedSchool(false);
  }, [address]);

  const updateAddress = useCallback((value: string) => {
    setAddress(value);
    setHomeCoordinates(undefined);
  }, []);

  const selectAddressSuggestion = useCallback(
    (value: string, coordinates: Coordinates) => {
      setAddress(value);
      setSubmittedAddress(value);
      setHomeCoordinates(coordinates);
    },
    []
  );

  const selectFilter = useCallback((filter: SchoolFilter) => {
    setSelectedFilter(filter);
    setSelectedSchool(undefined);
    setShouldPanToSelectedSchool(false);
  }, []);

  const selectSchool = useCallback((school: School) => {
    setSelectedSchool(school);
    setShouldPanToSelectedSchool(true);
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
    commuteError,
    commuteResults,
    counts,
    filteredSchools,
    allSchools,
    hasSearched,
    homeCoordinates,
    isLoadingCommute,
    nearbySchools,
    radiusMinutes,
    schoolCoordinatesMap,
    selectedFilter,
    submittedAddress,
    search,
    saveSchoolCoordinates,
    selectFilter,
    selectAddressSuggestion,
    selectSchool,
    shouldPanToSelectedSchool,
    setAddress: updateAddress,
    setHomeCoordinates,
    setRadiusMinutes
  };
}
