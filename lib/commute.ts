import type {
  CommuteDestination,
  CommuteFit,
  CommuteResult,
  Coordinates
} from "@/types/school";

type RouteTravelMode = "DRIVE" | "WALK" | "TRANSIT";

type RouteMatrixElement = {
  destinationIndex?: number;
  duration?: string;
  distanceMeters?: number;
  status?: {
    code?: number;
    message?: string;
  };
  condition?: string;
};

const ROUTES_API_URL =
  "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
const ROUTE_BATCH_SIZE = 25;
const METERS_PER_MILE = 1609.344;
const BIKE_MILES_PER_HOUR = 10;

export type ComputeCommuteParams = {
  origin: Coordinates;
  destinations: CommuteDestination[];
};

export async function computeCommutes({
  origin,
  destinations
}: ComputeCommuteParams): Promise<CommuteResult[]> {
  if (destinations.length === 0) {
    return [];
  }

  const destinationBatches = chunk(destinations, ROUTE_BATCH_SIZE);
  const results = new Map<string, CommuteResult>();

  destinationBatches.forEach((batch) => {
    batch.forEach((destination) => {
      results.set(destination.schoolId, createEmptyCommute(destination.schoolId));
    });
  });

  for (const batch of destinationBatches) {
    const [driving, walking, transit] = await Promise.all([
      fetchRouteMatrix({ origin, destinations: batch, travelMode: "DRIVE" }),
      fetchRouteMatrix({ origin, destinations: batch, travelMode: "WALK" }),
      fetchRouteMatrix({ origin, destinations: batch, travelMode: "TRANSIT" })
    ]);

    mergeRouteResults(results, batch, driving, "drivingMinutes");
    mergeRouteResults(results, batch, walking, "walkingMinutes");
    mergeRouteResults(results, batch, transit, "transitMinutes");

    batch.forEach((destination) => {
      const result = results.get(destination.schoolId);

      if (!result) {
        return;
      }

      result.bikingMinutes = estimateBikingMinutes(result.distanceMiles);
      result.commuteFit = getCommuteFit(result);
    });
  }

  return Array.from(results.values());
}

export function getCommuteFit(
  result: Pick<CommuteResult, "drivingMinutes" | "transitMinutes">
): CommuteFit {
  const transit = result.transitMinutes;
  const driving = result.drivingMinutes;

  if (
    (typeof transit === "number" && transit <= 20) ||
    (typeof driving === "number" && driving <= 15)
  ) {
    return "High";
  }

  if (
    (typeof transit === "number" && transit <= 35) ||
    (typeof driving === "number" && driving <= 25)
  ) {
    return "Medium";
  }

  return "Low";
}

export function getCommuteSortValue(
  result: CommuteResult | undefined,
  mode: "transit" | "driving" | "walking" | "biking" = "transit"
) {
  if (!result) {
    return Number.POSITIVE_INFINITY;
  }

  const valueByMode = {
    transit: result.transitMinutes,
    driving: result.drivingMinutes,
    walking: result.walkingMinutes,
    biking: result.bikingMinutes
  };

  return valueByMode[mode] ?? Number.POSITIVE_INFINITY;
}

function createEmptyCommute(schoolId: string): CommuteResult {
  return {
    schoolId,
    distanceMiles: null,
    drivingMinutes: null,
    walkingMinutes: null,
    bikingMinutes: null,
    transitMinutes: null,
    transitLabel: "Muni / Transit",
    commuteFit: "Low"
  };
}

function mergeRouteResults(
  results: Map<string, CommuteResult>,
  destinations: CommuteDestination[],
  routeElements: RouteMatrixElement[],
  minutesField: "drivingMinutes" | "walkingMinutes" | "transitMinutes"
) {
  routeElements.forEach((element) => {
    if (typeof element.destinationIndex !== "number") {
      return;
    }

    const destination = destinations[element.destinationIndex];
    const result = destination ? results.get(destination.schoolId) : undefined;

    if (!result || !isSuccessfulRouteElement(element)) {
      return;
    }

    result[minutesField] = parseDurationMinutes(element.duration);

    if (
      minutesField === "drivingMinutes" &&
      typeof element.distanceMeters === "number"
    ) {
      result.distanceMiles = metersToMiles(element.distanceMeters);
    }

    if (
      result.distanceMiles === null &&
      typeof element.distanceMeters === "number"
    ) {
      result.distanceMiles = metersToMiles(element.distanceMeters);
    }
  });
}

async function fetchRouteMatrix({
  origin,
  destinations,
  travelMode
}: ComputeCommuteParams & { travelMode: RouteTravelMode }) {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GOOGLE_MAPS_SERVER_API_KEY.");
  }

  const response = await fetch(ROUTES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "originIndex,destinationIndex,duration,distanceMeters,status,condition"
    },
    body: JSON.stringify({
      origins: [toRouteWaypoint(origin)],
      destinations: destinations.map((destination) =>
        toRouteWaypoint(destination.coordinates)
      ),
      travelMode
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Routes API failed: ${response.status} ${message}`);
  }

  return (await response.json()) as RouteMatrixElement[];
}

function toRouteWaypoint(coordinates: Coordinates) {
  return {
    waypoint: {
      location: {
        latLng: {
          latitude: coordinates.lat,
          longitude: coordinates.lng
        }
      }
    }
  };
}

function isSuccessfulRouteElement(element: RouteMatrixElement) {
  const okStatus = !element.status || element.status.code === 0;
  const reachable =
    !element.condition || element.condition === "ROUTE_EXISTS";

  return okStatus && reachable;
}

function parseDurationMinutes(duration: string | undefined) {
  if (!duration) {
    return null;
  }

  const seconds = Number(duration.replace("s", ""));

  if (!Number.isFinite(seconds)) {
    return null;
  }

  return Math.max(1, Math.round(seconds / 60));
}

function metersToMiles(meters: number) {
  return Number((meters / METERS_PER_MILE).toFixed(1));
}

function estimateBikingMinutes(distanceMiles: number | null) {
  if (distanceMiles === null) {
    return null;
  }

  return Math.max(1, Math.round((distanceMiles / BIKE_MILES_PER_HOUR) * 60));
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
