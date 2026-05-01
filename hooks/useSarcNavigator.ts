"use client";

import { useCallback, useMemo, useState } from "react";
import { useCommuteResults } from "@/hooks/useCommuteResults";
import { sfusdSchools } from "@/data/sfusd_schools";
import { RADIUS_METERS_BY_MINUTES } from "@/lib/mapConfig";
import {
  filterSchoolsByType,
  filterSchoolsWithinRadius,
  getDistanceMilesBetweenCoordinates,
  getSchoolCounts,
  normalizeSchools
} from "@/lib/schoolUtils";
import type {
  Coordinates,
  CoordinatesBySchoolId,
  RadiusMinutes,
  SearchMode,
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
  const [schoolQuery, setSchoolQuery] = useState("");
  const [submittedAddress, setSubmittedAddress] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("address");
  const [selectedFilter, setSelectedFilter] = useState<SchoolFilter>("all");
  const [selectedSchool, setSelectedSchool] = useState<School | undefined>();
  const [centerSchool, setCenterSchool] = useState<School | undefined>();
  const [shouldPanToSelectedSchool, setShouldPanToSelectedSchool] =
    useState(false);
  const [homeCoordinates, setHomeCoordinates] = useState<Coordinates>();
  const [radiusMinutes, setRadiusMinutes] = useState<RadiusMinutes>(20);
  const [schoolCoordinatesMap, setSchoolCoordinatesMap] =
    useState<CoordinatesBySchoolId>(initialSchoolCoordinatesMap);

  const counts = useMemo(() => getSchoolCounts(allSchools), []);
  const filteredSchools = useMemo(
    () => filterSchoolsByType(allSchools, selectedFilter),
    [selectedFilter]
  );
  const schoolSuggestions = useMemo(() => {
    const query = schoolQuery.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return allSchools
      .filter((school) => school.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [schoolQuery]);
  const comparisonAddressCoordinates = homeCoordinates;
  const centerCoordinates = centerSchool
    ? schoolCoordinatesMap[centerSchool.id]
    : comparisonAddressCoordinates;
  const nearbySchools = useMemo(() => {
    if (searchMode === "school" && centerSchool) {
      return filterSchoolsWithinRadius({
        centerCoordinates,
        radiusMeters: RADIUS_METERS_BY_MINUTES[radiusMinutes],
        schoolCoordinatesMap,
        schools: filteredSchools
      })
        .filter((school) => school.id !== centerSchool.id)
        .sort((schoolA, schoolB) => {
          const coordinatesA = schoolCoordinatesMap[schoolA.id];
          const coordinatesB = schoolCoordinatesMap[schoolB.id];

          return (
            getDistanceMilesBetweenCoordinates(centerCoordinates, coordinatesA) -
            getDistanceMilesBetweenCoordinates(centerCoordinates, coordinatesB)
          );
        });
    }

    return filterSchoolsWithinRadius({
      centerCoordinates: comparisonAddressCoordinates,
      radiusMeters: RADIUS_METERS_BY_MINUTES[radiusMinutes],
      schoolCoordinatesMap,
      schools: filteredSchools
    }).sort((schoolA, schoolB) => {
      const coordinatesA = schoolCoordinatesMap[schoolA.id];
      const coordinatesB = schoolCoordinatesMap[schoolB.id];

      return (
        getDistanceMilesBetweenCoordinates(
          comparisonAddressCoordinates,
          coordinatesA
        ) -
        getDistanceMilesBetweenCoordinates(
          comparisonAddressCoordinates,
          coordinatesB
        )
      );
    });
  }, [
    centerCoordinates,
    centerSchool,
    comparisonAddressCoordinates,
    filteredSchools,
    radiusMinutes,
    schoolCoordinatesMap,
    searchMode
  ]);
  const activeSchool = useMemo(() => {
    if (searchMode === "school" && centerSchool) {
      if (selectedSchool && nearbySchools.some((school) => school.id === selectedSchool.id)) {
        return selectedSchool;
      }

      return centerSchool;
    }

    if (selectedSchool && nearbySchools.some((school) => school.id === selectedSchool.id)) {
      return selectedSchool;
    }

    return nearbySchools[0];
  }, [centerSchool, nearbySchools, searchMode, selectedSchool]);
  const { commuteError, commuteResults, isLoadingCommute } = useCommuteResults({
    hasSearched,
    homeCoordinates: comparisonAddressCoordinates,
    schoolCoordinatesMap,
    schools: activeSchool ? [activeSchool] : []
  });

  const search = useCallback(() => {
    setHomeCoordinates(undefined);
    setHasSearched(true);
    setSubmittedAddress(address);
    setShouldPanToSelectedSchool(false);
  }, [address]);

  const searchAddress = useCallback((value: string) => {
    setAddress(value);
    setHomeCoordinates(undefined);
    setHasSearched(true);
    setSubmittedAddress(value);
    setShouldPanToSelectedSchool(false);
  }, []);

  const updateAddress = useCallback((value: string) => {
    setAddress(value);
  }, []);

  const updateSchoolQuery = useCallback((value: string) => {
    setSchoolQuery(value);

    if (!value.trim()) {
      setCenterSchool(undefined);
      setSelectedSchool(undefined);
      setSearchMode("address");
      setShouldPanToSelectedSchool(false);
    }
  }, []);

  const selectAddressSuggestion = useCallback(
    (value: string, coordinates: Coordinates) => {
      setAddress(value);
      setSubmittedAddress(value);
      setHomeCoordinates(coordinates);
    },
    []
  );

  const submitCurrentLocation = useCallback(
    (value: string, coordinates: Coordinates) => {
      setAddress(value);
      setSubmittedAddress(value);
      setHomeCoordinates(coordinates);
      setHasSearched(true);
      setShouldPanToSelectedSchool(false);
    },
    []
  );

  const selectFilter = useCallback((filter: SchoolFilter) => {
    setSelectedFilter(filter);
  }, []);

  const selectSchool = useCallback((school: School) => {
    setSelectedSchool(school);
    setShouldPanToSelectedSchool(true);
  }, []);

  const selectSearchSchool = useCallback((school: School) => {
    setSchoolQuery(school.name);
    setIsSearchDropdownOpen(false);
    setSelectedSchool(undefined);
    setCenterSchool(school);
    setSearchMode("school");
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
    isSearchDropdownOpen,
    centerCoordinates,
    centerSchool,
    nearbySchools,
    radiusMinutes,
    searchMode,
    comparisonAddressCoordinates,
    schoolQuery,
    schoolCoordinatesMap,
    schoolSuggestions,
    selectedFilter,
    selectedRadiusMinutes: radiusMinutes,
    selectedSchoolType: selectedFilter,
    submittedAddress,
    search,
    searchAddress,
    saveSchoolCoordinates,
    selectFilter,
    selectAddressSuggestion,
    selectSearchSchool,
    selectSchool,
    submitCurrentLocation,
    shouldPanToSelectedSchool,
    setIsSearchDropdownOpen,
    setSchoolQuery: updateSchoolQuery,
    setAddress: updateAddress,
    setHomeCoordinates,
    setRadiusMinutes
  };
}
