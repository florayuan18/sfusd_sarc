"use client";

import { useCallback, useMemo, useState } from "react";
import { useCommuteResults } from "@/hooks/useCommuteResults";
import { sfusdSchools } from "@/data/sfusd_schools";
import {
  getFilteredSchools,
  getInitialSchoolForFilter,
  getNearbySchoolsWithPinnedSelection,
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
  const { commuteError, commuteResults, isLoadingCommute } = useCommuteResults({
    hasSearched,
    homeCoordinates,
    schoolCoordinatesMap,
    schools: filteredSchools
  });
  const nearbySchools = useMemo(
    () =>
      getNearbySchoolsWithPinnedSelection({
        commuteResults,
        limit: MAX_NEARBY_SCHOOLS,
        schools: filteredSchools,
        selectedSchool
      }),
    [commuteResults, filteredSchools, selectedSchool]
  );
  const activeSchool = selectedSchool ?? nearbySchools[0];

  const search = useCallback(() => {
    setHasSearched(true);
    setSelectedFilter("all");
    setSelectedSchool(allSchools[0]);
  }, []);

  const updateAddress = useCallback((value: string) => {
    setAddress(value);
    setHomeCoordinates(undefined);
  }, []);

  const selectAddressSuggestion = useCallback(
    (value: string, coordinates: Coordinates) => {
      setAddress(value);
      setHomeCoordinates(coordinates);
    },
    []
  );

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
    commuteError,
    commuteResults,
    counts,
    filteredSchools,
    hasSearched,
    homeCoordinates,
    isLoadingCommute,
    nearbySchools,
    radiusMinutes,
    schoolCoordinatesMap,
    selectedFilter,
    search,
    saveSchoolCoordinates,
    selectFilter,
    selectAddressSuggestion,
    selectSchool: setSelectedSchool,
    setAddress: updateAddress,
    setHomeCoordinates,
    setRadiusMinutes
  };
}
