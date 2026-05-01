"use client";

import { useEffect, useRef } from "react";
import { HOME_MARKER_Z_INDEX, RADIUS_METERS_BY_MINUTES } from "@/lib/mapConfig";
import { getHomeMarkerIcon } from "@/lib/mapMarkers";
import type { MapStatus } from "@/types/map";
import type { Coordinates, RadiusMinutes } from "@/types/school";

type UseHomeMarkerParams = {
  circleCenterCoordinates?: Coordinates;
  homeCoordinates?: Coordinates;
  mapRef: React.MutableRefObject<google.maps.Map | undefined>;
  mapStatus: MapStatus;
  radiusMinutes: RadiusMinutes;
};

export function useHomeMarker({
  circleCenterCoordinates,
  homeCoordinates,
  mapRef,
  mapStatus,
  radiusMinutes
}: UseHomeMarkerParams) {
  const homeMarkerRef = useRef<google.maps.Marker>();
  const radiusCircleRef = useRef<google.maps.Circle>();

  useEffect(() => {
    if (mapStatus !== "ready" || (!homeCoordinates && !circleCenterCoordinates)) {
      return;
    }

    const google = window.google;
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (homeCoordinates && !homeMarkerRef.current) {
      homeMarkerRef.current = new google.maps.Marker({
        map,
        title: "Home",
        zIndex: HOME_MARKER_Z_INDEX,
        icon: getHomeMarkerIcon(google)
      });
    }

    if (homeMarkerRef.current) {
      if (homeCoordinates) {
        homeMarkerRef.current.setMap(map);
        homeMarkerRef.current.setPosition(homeCoordinates);
      } else {
        homeMarkerRef.current.setMap(null);
      }
    }

    if (!radiusCircleRef.current) {
      radiusCircleRef.current = new google.maps.Circle({
        map,
        fillColor: "#2563eb",
        fillOpacity: 0.08,
        strokeColor: "#2563eb",
        strokeOpacity: 0.28,
        strokeWeight: 2
      });
    }

    radiusCircleRef.current.setCenter(
      circleCenterCoordinates ?? homeCoordinates ?? null
    );
    radiusCircleRef.current.setRadius(RADIUS_METERS_BY_MINUTES[radiusMinutes]);
  }, [
    circleCenterCoordinates,
    homeCoordinates,
    mapRef,
    mapStatus,
    radiusMinutes
  ]);
}
