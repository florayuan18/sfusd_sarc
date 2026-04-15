"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geocodeHomeAddress, geocodeSchoolAddress } from "@/lib/geocode";
import { isGoogleMapsConfigured, loadGoogleMaps } from "@/lib/googleMaps";
import type {
  Coordinates,
  CoordinatesBySchoolId,
  RadiusMinutes,
  School
} from "@/types/school";

const SAN_FRANCISCO_CIVIC_CENTER: Coordinates = {
  lat: 37.7793,
  lng: -122.4193
};

const RADIUS_METERS_BY_MINUTES: Record<RadiusMinutes, number> = {
  10: 800,
  20: 1600,
  30: 2400
};

type SchoolMapProps = {
  homeAddress: string;
  homeCoordinates?: Coordinates;
  radiusMinutes: RadiusMinutes;
  schools: School[];
  schoolCoordinatesMap: CoordinatesBySchoolId;
  selectedSchoolId?: string;
  onHomeCoordinatesChange: (coordinates?: Coordinates) => void;
  onRadiusMinutesChange: (radiusMinutes: RadiusMinutes) => void;
  onSchoolCoordinatesResolved: (
    schoolId: string,
    coordinates: Coordinates
  ) => void;
  onSelectSchool: (school: School) => void;
};

type MapStatus = "idle" | "loading" | "ready" | "error" | "missing-key";

export function SchoolMap({
  homeAddress,
  homeCoordinates,
  radiusMinutes,
  schools,
  schoolCoordinatesMap,
  selectedSchoolId,
  onHomeCoordinatesChange,
  onRadiusMinutesChange,
  onSchoolCoordinatesResolved,
  onSelectSchool
}: SchoolMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map>();
  const homeMarkerRef = useRef<google.maps.Marker>();
  const radiusCircleRef = useRef<google.maps.Circle>();
  const schoolMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow>();
  const geocodingSchoolIdsRef = useRef<Set<string>>(new Set());

  const [mapStatus, setMapStatus] = useState<MapStatus>("idle");
  const [geocodingCount, setGeocodingCount] = useState(0);
  const [homeGeocodeStatus, setHomeGeocodeStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");

  const resolvedMarkerCount = useMemo(
    () => schools.filter((school) => schoolCoordinatesMap[school.id]).length,
    [schoolCoordinatesMap, schools]
  );

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

        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center: SAN_FRANCISCO_CIVIC_CENTER,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          styles: [
            {
              featureType: "poi",
              stylers: [{ visibility: "off" }]
            }
          ]
        });

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

  useEffect(() => {
    if (mapStatus !== "ready") {
      return;
    }

    let isMounted = true;

    setHomeGeocodeStatus("loading");

    geocodeHomeAddress(homeAddress)
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
  }, [homeAddress, mapStatus, onHomeCoordinatesChange]);

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
    const concurrencyLimit = 4;
    let cursor = 0;
    let activeRequests = 0;
    let completedRequests = 0;

    setGeocodingCount((count) => count + schoolsToGeocode.length);
    schoolsToGeocode.forEach((school) =>
      geocodingSchoolIdsRef.current.add(school.id)
    );

    function runNext() {
      if (isCancelled) {
        return;
      }

      while (activeRequests < concurrencyLimit && cursor < schoolsToGeocode.length) {
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
            completedRequests += 1;
            geocodingSchoolIdsRef.current.delete(school.id);

            if (!isCancelled) {
              setGeocodingCount((count) => Math.max(0, count - 1));
              runNext();
            }

            if (completedRequests === schoolsToGeocode.length) {
              setGeocodingCount((count) => Math.max(0, count));
            }
          });
      }
    }

    runNext();

    return () => {
      isCancelled = true;
    };
  }, [mapStatus, onSchoolCoordinatesResolved, schoolCoordinatesMap, schools]);

  useEffect(() => {
    if (mapStatus !== "ready" || !homeCoordinates) {
      return;
    }

    const google = window.google;
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (!homeMarkerRef.current) {
      homeMarkerRef.current = new google.maps.Marker({
        map,
        title: "Home",
        zIndex: 1000,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#111827",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3
        }
      });
    }

    homeMarkerRef.current.setPosition(homeCoordinates);

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

    radiusCircleRef.current.setCenter(homeCoordinates);
    radiusCircleRef.current.setRadius(RADIUS_METERS_BY_MINUTES[radiusMinutes]);
  }, [homeCoordinates, mapStatus, radiusMinutes]);

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
      const marker = new google.maps.Marker({
        map,
        position: coordinates,
        title: school.name,
        zIndex: isSelected ? 500 : 100,
        icon: getSchoolMarkerIcon(google, isSelected)
      });

      marker.addListener("click", () => onSelectSchool(school));
      marker.addListener("mouseover", () => {
        infoWindow.setContent(
          `<div style="font-weight:600;color:#111827;">${school.name}</div>`
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
    mapStatus,
    onSelectSchool,
    schoolCoordinatesMap,
    schools,
    selectedSchoolId
  ]);

  useEffect(() => {
    if (mapStatus !== "ready" || !selectedSchoolId) {
      return;
    }

    const selectedCoordinates = schoolCoordinatesMap[selectedSchoolId];

    if (selectedCoordinates) {
      mapRef.current?.panTo(selectedCoordinates);
    }
  }, [mapStatus, schoolCoordinatesMap, selectedSchoolId]);

  return (
    <section className="relative min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-soft">
      <div ref={mapContainerRef} className="absolute inset-0" />

      {mapStatus !== "ready" ? (
        <MapOverlay status={mapStatus} />
      ) : (
        <>
          <div className="absolute left-6 top-6 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            Map
          </div>

          <div className="absolute right-6 top-6 rounded-2xl bg-white p-2 shadow-sm">
            <div className="flex gap-1">
              {([10, 20, 30] as RadiusMinutes[]).map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => onRadiusMinutesChange(minutes)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    radiusMinutes === minutes
                      ? "bg-accent text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>

          <div className="absolute bottom-6 left-6 max-w-xs rounded-xl bg-white/95 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur">
            {homeGeocodeStatus === "loading"
              ? "Locating home address..."
              : homeGeocodeStatus === "error"
                ? "Could not locate that home address. Showing SF map context."
                : `Showing ${resolvedMarkerCount} school markers`}
            {geocodingCount > 0 ? ` · loading ${geocodingCount}` : ""}
          </div>
        </>
      )}
    </section>
  );
}

function MapOverlay({ status }: { status: MapStatus }) {
  const title =
    status === "missing-key"
      ? "Google Maps API key needed"
      : status === "error"
        ? "Map could not load"
        : "Loading map";

  const message =
    status === "missing-key"
      ? "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local, then restart the dev server."
      : status === "error"
        ? "Check the API key, enabled Google Maps JavaScript API, and billing settings."
        : "Preparing Google Maps and school markers.";

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-soft">
        <div className="text-sm font-semibold uppercase tracking-wide text-accent">
          Map
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
      </div>
    </div>
  );
}

function getSchoolMarkerIcon(
  google: typeof window.google,
  isSelected: boolean
): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: isSelected ? 11 : 8,
    fillColor: isSelected ? "#1d4ed8" : "#2563eb",
    fillOpacity: 0.95,
    strokeColor: "#ffffff",
    strokeWeight: isSelected ? 4 : 3
  };
}
