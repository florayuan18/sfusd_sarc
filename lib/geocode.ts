import { loadGoogleMaps } from "@/lib/googleMaps";
import type { Coordinates, School } from "@/types/school";

const geocodeCache = new Map<string, Promise<Coordinates | null>>();

export function geocodeHomeAddress(address: string) {
  return geocodeAddress(formatSfAddress(address));
}

export function geocodeSchoolAddress(school: School) {
  return geocodeAddress(formatSfAddress(school.address));
}

export function getCachedGeocode(address: string) {
  return geocodeCache.get(getCacheKey(address));
}

async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const cacheKey = getCacheKey(address);
  const cachedResult = geocodeCache.get(cacheKey);

  if (cachedResult) {
    return cachedResult;
  }

  const geocodePromise = loadGoogleMaps()
    .then(
      (google) =>
        new Promise<Coordinates | null>((resolve) => {
          const geocoder = new google.maps.Geocoder();

          geocoder.geocode(
            {
              address,
              componentRestrictions: {
                country: "US"
              }
            },
            (results, status) => {
              if (status !== google.maps.GeocoderStatus.OK || !results?.[0]) {
                resolve(null);
                return;
              }

              const location = results[0].geometry.location;

              resolve({
                lat: location.lat(),
                lng: location.lng()
              });
            }
          );
        })
    )
    .catch(() => null);

  geocodeCache.set(cacheKey, geocodePromise);
  return geocodePromise;
}

function formatSfAddress(address: string) {
  const trimmedAddress = address.trim();

  if (!trimmedAddress) {
    return "San Francisco Civic Center, San Francisco, CA";
  }

  if (/san francisco/i.test(trimmedAddress)) {
    return trimmedAddress;
  }

  return `${trimmedAddress}, San Francisco, CA`;
}

function getCacheKey(address: string) {
  return address.trim().toLowerCase();
}
