import { NextResponse } from "next/server";
import { geocodeAddressServer } from "@/lib/geocode";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string };

    if (!body.address || body.address.trim().length === 0) {
      return NextResponse.json(
        { error: "Address is required." },
        { status: 400 }
      );
    }

    const coordinates = await geocodeAddressServer(body.address);

    return NextResponse.json({ coordinates });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to geocode address."
      },
      { status: 500 }
    );
  }
}
