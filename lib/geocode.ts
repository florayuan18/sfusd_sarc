import { loadGoogleMaps } from "@/lib/googleMaps";
import type { Coordinates, School } from "@/types/school";

const geocodeCache = new Map<string, Promise<Coordinates | null>>();
const GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export function geocodeHomeAddress(address: string) {
  return geocodeAddress(formatSfAddress(address));
}

export async function geocodeHomeAddressViaApi(address: string) {
  const response = await fetch("/api/geocode", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ address })
  });

  const payload = (await response.json()) as {
    coordinates?: Coordinates;
    error?: string;
  };

  if (!response.ok || !payload.coordinates) {
    throw new Error(payload.error || "Unable to geocode address.");
  }

  return payload.coordinates;
}

export function geocodeSchoolAddress(school: School) {
  return geocodeAddress(formatSfAddress(school.address));
}

export function getCachedGeocode(address: string) {
  return geocodeCache.get(getCacheKey(address));
}

export async function geocodeAddressServer(address: string) {
  const apiKey =
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GOOGLE_MAPS_SERVER_API_KEY.");
  }

  const params = new URLSearchParams({
    address: formatSfAddress(address),
    key: apiKey,
    components: "country:US"
  });

  const response = await fetch(`${GOOGLE_GEOCODING_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Geocoding API failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{
      geometry: {
        location: Coordinates;
      };
    }>;
  };

  if (payload.status !== "OK" || !payload.results?.[0]) {
    throw new Error(payload.error_message || `Geocoding failed: ${payload.status}`);
  }

  return payload.results[0].geometry.location;
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
