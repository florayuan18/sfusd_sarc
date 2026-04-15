"use client";

import { useEffect, useState } from "react";
import { geocodeHomeAddressViaApi } from "@/lib/geocode";
import type { HomeGeocodeStatus, MapStatus } from "@/types/map";
import type { Coordinates } from "@/types/school";

type UseHomeGeocodingParams = {
  homeAddress: string;
  homeCoordinates?: Coordinates;
  mapRef: React.MutableRefObject<google.maps.Map | undefined>;
  mapStatus: MapStatus;
  onHomeCoordinatesChange: (coordinates?: Coordinates) => void;
};

export function useHomeGeocoding({
  homeAddress,
  homeCoordinates,
  mapRef,
  mapStatus,
  onHomeCoordinatesChange
}: UseHomeGeocodingParams) {
  const [homeGeocodeStatus, setHomeGeocodeStatus] =
    useState<HomeGeocodeStatus>("idle");

  useEffect(() => {
    if (mapStatus !== "ready") {
      return;
    }

    if (homeCoordinates) {
      setHomeGeocodeStatus("idle");
      mapRef.current?.panTo(homeCoordinates);
      mapRef.current?.setZoom(13);
      return;
    }

    let isMounted = true;

    setHomeGeocodeStatus("loading");

    geocodeHomeAddressViaApi(homeAddress)
      .then((coordinates) => {
        if (!isMounted) {
          return;
        }

        if (!coordinates) {
          onHomeCoordinatesChange(undefined);
          setHomeGeocodeStatus("error");
          return;
        }

        onHomeCoordinatesChange(coordinates);
        setHomeGeocodeStatus("idle");
        mapRef.current?.panTo(coordinates);
        mapRef.current?.setZoom(13);
      })
      .catch(() => {
        if (isMounted) {
          onHomeCoordinatesChange(undefined);
          setHomeGeocodeStatus("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    homeAddress,
    homeCoordinates,
    mapRef,
    mapStatus,
    onHomeCoordinatesChange
  ]);

  return homeGeocodeStatus;
}
