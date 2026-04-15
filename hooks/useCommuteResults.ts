"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CommuteDestination,
  CommuteResult,
  CommuteResultsBySchoolId,
  Coordinates,
  CoordinatesBySchoolId,
  School
} from "@/types/school";

const MAX_COMMUTE_DESTINATIONS = 40;

type UseCommuteResultsParams = {
  hasSearched: boolean;
  homeCoordinates?: Coordinates;
  schoolCoordinatesMap: CoordinatesBySchoolId;
  schools: School[];
};

type CommuteApiResponse = {
  results?: CommuteResult[];
  error?: string;
};

const commuteSessionCache = new Map<string, CommuteResult[]>();

export function useCommuteResults({
  hasSearched,
  homeCoordinates,
  schoolCoordinatesMap,
  schools
}: UseCommuteResultsParams) {
  const [commuteResults, setCommuteResults] =
    useState<CommuteResultsBySchoolId>({});
  const [isLoadingCommute, setIsLoadingCommute] = useState(false);
  const [commuteError, setCommuteError] = useState<string | null>(null);
  const inFlightRequestKeysRef = useRef<Set<string>>(new Set());
  const inFlightSchoolIdsRef = useRef<Set<string>>(new Set());
  const originKey = homeCoordinates ? getOriginKey(homeCoordinates) : null;

  const destinations = useMemo(
    () =>
      schools
        .map((school): CommuteDestination | null => {
          const coordinates = schoolCoordinatesMap[school.id];

          if (!coordinates) {
            return null;
          }

          return {
            schoolId: school.id,
            coordinates
          };
        })
        .filter((destination): destination is CommuteDestination =>
          Boolean(destination)
        )
        .filter(
          (destination) =>
            !commuteResults[destination.schoolId] &&
            !inFlightSchoolIdsRef.current.has(destination.schoolId)
        )
        .slice(0, MAX_COMMUTE_DESTINATIONS),
    [commuteResults, schoolCoordinatesMap, schools]
  );

  useEffect(() => {
    setCommuteResults({});
    setCommuteError(null);
    inFlightRequestKeysRef.current.clear();
    inFlightSchoolIdsRef.current.clear();
  }, [originKey]);

  useEffect(() => {
    if (!hasSearched || !homeCoordinates || destinations.length === 0) {
      return;
    }

    const requestKey = getCommuteCacheKey(homeCoordinates, destinations);

    if (commuteSessionCache.has(requestKey)) {
      mergeCommuteResults(
        setCommuteResults,
        commuteSessionCache.get(requestKey) ?? []
      );
      return;
    }

    if (inFlightRequestKeysRef.current.has(requestKey)) {
      return;
    }

    let isCancelled = false;

    inFlightRequestKeysRef.current.add(requestKey);
    destinations.forEach((destination) => {
      inFlightSchoolIdsRef.current.add(destination.schoolId);
    });
    setIsLoadingCommute(true);
    setCommuteError(null);

    fetch("/api/commute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        origin: homeCoordinates,
        destinations
      })
    })
      .then(async (response) => {
        const payload = (await response.json()) as CommuteApiResponse;

        if (!response.ok || !payload.results) {
          throw new Error(payload.error || "Unable to calculate commutes.");
        }

        commuteSessionCache.set(requestKey, payload.results);

        if (!isCancelled) {
          mergeCommuteResults(setCommuteResults, payload.results);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setCommuteError(
            error instanceof Error
              ? error.message
              : "Unable to calculate commutes."
          );
        }
      })
      .finally(() => {
        inFlightRequestKeysRef.current.delete(requestKey);
        destinations.forEach((destination) => {
          inFlightSchoolIdsRef.current.delete(destination.schoolId);
        });

        if (!isCancelled) {
          setIsLoadingCommute(inFlightRequestKeysRef.current.size > 0);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [destinations, hasSearched, homeCoordinates]);

  return {
    commuteError,
    commuteResults,
    isLoadingCommute
  };
}

function mergeCommuteResults(
  setCommuteResults: Dispatch<SetStateAction<CommuteResultsBySchoolId>>,
  results: CommuteResult[]
) {
  setCommuteResults((currentResults) => {
    const nextResults = { ...currentResults };

    results.forEach((result) => {
      nextResults[result.schoolId] = result;
    });

    return nextResults;
  });
}

function getCommuteCacheKey(
  origin: Coordinates,
  destinations: CommuteDestination[]
) {
  const destinationKey = destinations
    .map((destination) => destination.schoolId)
    .sort()
    .join(",");

  return `${getOriginKey(origin)}:${destinationKey}`;
}

function getOriginKey(origin: Coordinates) {
  return `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}`;
}
