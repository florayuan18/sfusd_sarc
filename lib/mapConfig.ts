import type { Coordinates, RadiusMinutes } from "@/types/school";

export const SAN_FRANCISCO_CIVIC_CENTER: Coordinates = {
  lat: 37.7793,
  lng: -122.4193
};

export const RADIUS_OPTIONS: RadiusMinutes[] = [10, 20, 30];

export const RADIUS_METERS_BY_MINUTES: Record<RadiusMinutes, number> = {
  10: 800,
  20: 1600,
  30: 2400
};

export const MAP_OPTIONS: google.maps.MapOptions = {
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
};

export const HOME_MARKER_Z_INDEX = 1000;
export const SELECTED_SCHOOL_MARKER_Z_INDEX = 500;
export const SCHOOL_MARKER_Z_INDEX = 100;
