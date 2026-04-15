"use client";

import { useEffect, useRef, useState } from "react";
import { isGoogleMapsConfigured, loadGoogleMaps } from "@/lib/googleMaps";
import { MAP_OPTIONS } from "@/lib/mapConfig";
import type { MapStatus } from "@/types/map";

export function useGoogleMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map>();
  const infoWindowRef = useRef<google.maps.InfoWindow>();
  const [mapStatus, setMapStatus] = useState<MapStatus>("idle");

  useEffect(() => {
    let isMounted = true;

    if (!isGoogleMapsConfigured()) {
      setMapStatus("missing-key");
      return;
    }

    setMapStatus("loading");

    loadGoogleMaps()
      .then((google) => {
        if (!isMounted || !mapContainerRef.current || mapRef.current) {
          return;
        }

        mapRef.current = new google.maps.Map(
          mapContainerRef.current,
          MAP_OPTIONS
        );
        infoWindowRef.current = new google.maps.InfoWindow();
        setMapStatus("ready");
      })
      .catch(() => {
        if (isMounted) {
          setMapStatus("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    infoWindowRef,
    mapContainerRef,
    mapRef,
    mapStatus
  };
}
