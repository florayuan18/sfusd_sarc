import { NextResponse } from "next/server";
import { computeCommutes } from "@/lib/commute";
import type { CommuteDestination, Coordinates } from "@/types/school";

type CommuteRequestBody = {
  origin?: Coordinates;
  destinations?: CommuteDestination[];
};

const MAX_DESTINATIONS_PER_REQUEST = 50;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CommuteRequestBody;

    if (!isValidCoordinates(body.origin)) {
      return NextResponse.json(
        { error: "Valid origin coordinates are required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.destinations)) {
      return NextResponse.json(
        { error: "Destinations array is required." },
        { status: 400 }
      );
    }

    const destinations = body.destinations
      .filter((destination) => isValidCoordinates(destination.coordinates))
      .slice(0, MAX_DESTINATIONS_PER_REQUEST);

    const results = await computeCommutes({
      origin: body.origin,
      destinations
    });

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to calculate commute metrics."
      },
      { status: 500 }
    );
  }
}

function isValidCoordinates(
  coordinates: Coordinates | undefined
): coordinates is Coordinates {
  return (
    Boolean(coordinates) &&
    typeof coordinates?.lat === "number" &&
    Number.isFinite(coordinates.lat) &&
    typeof coordinates?.lng === "number" &&
    Number.isFinite(coordinates.lng)
  );
}
