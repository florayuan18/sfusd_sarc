import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const dataJsonPath = path.join(rootDir, "data", "sfusd_schools.json");
const rootJsonPath = path.join(rootDir, "sfusd_schools.json");
const geocodingUrl = "https://maps.googleapis.com/maps/api/geocode/json";
const requestDelayMs = 120;
const sanFranciscoBounds = {
  minLat: 37.68,
  maxLat: 37.84,
  minLng: -122.53,
  maxLng: -122.35
};

await loadEnvFile(path.join(rootDir, ".env.local"));

const apiKey =
  process.env.GOOGLE_MAPS_SERVER_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing GOOGLE_MAPS_SERVER_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local."
  );
}

const schools = JSON.parse(await fs.readFile(dataJsonPath, "utf8"));
const nextSchools = [];
let geocodedCount = 0;

for (const [index, school] of schools.entries()) {
  if (
    typeof school.lat === "number" &&
    typeof school.lng === "number" &&
    isWithinSanFranciscoBounds({ lat: school.lat, lng: school.lng })
  ) {
    nextSchools.push(school);
    continue;
  }

  process.stdout.write(
    `[${index + 1}/${schools.length}] Geocoding ${school.name}... `
  );

  const coordinates = await geocodeSchoolAddress(school.address, apiKey);

  if (!coordinates) {
    process.stdout.write("no result\n");
    nextSchools.push(school);
  } else {
    process.stdout.write(`${coordinates.lat}, ${coordinates.lng}\n`);
    nextSchools.push({
      ...school,
      lat: coordinates.lat,
      lng: coordinates.lng
    });
    geocodedCount += 1;
  }

  await wait(requestDelayMs);
}

const nextJson = `${JSON.stringify(nextSchools, null, 2)}\n`;

await fs.writeFile(dataJsonPath, nextJson);
await fs.writeFile(rootJsonPath, nextJson);

console.log(`Done. Added coordinates to ${geocodedCount} schools.`);

async function geocodeAddress(address, apiKey) {
  const params = new URLSearchParams({
    address,
    components: "country:US",
    key: apiKey
  });

  const response = await fetch(`${geocodingUrl}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Geocoding API failed with ${response.status}.`);
  }

  const payload = await response.json();

  if (payload.status !== "OK" || !payload.results?.[0]) {
    if (payload.status === "ZERO_RESULTS") {
      return null;
    }

    throw new Error(payload.error_message || `Geocoding failed: ${payload.status}`);
  }

  const location = payload.results[0].geometry.location;

  return {
    lat: Number(location.lat),
    lng: Number(location.lng)
  };
}

async function geocodeSchoolAddress(address, apiKey) {
  const candidateAddresses = getCandidateAddresses(address);

  for (const candidateAddress of candidateAddresses) {
    const coordinates = await geocodeAddress(candidateAddress, apiKey);

    if (coordinates && isWithinSanFranciscoBounds(coordinates)) {
      return coordinates;
    }
  }

  return null;
}

function getCandidateAddresses(address) {
  const fullAddress = String(address).trim();
  const [firstAddressSegment] = fullAddress.split(";");
  const trailingCityStateZipMatch = fullAddress.match(
    /,\s*San Francisco,\s*CA(?:\s+\d{5})?$/i
  );
  const trailingCityStateZip = trailingCityStateZipMatch?.[0] ?? ", San Francisco, CA";
  const normalizedFirstSegment = firstAddressSegment.includes("San Francisco")
    ? firstAddressSegment.trim()
    : `${firstAddressSegment.trim()}${trailingCityStateZip}`;

  return Array.from(new Set([normalizedFirstSegment, fullAddress]));
}

function isWithinSanFranciscoBounds(coordinates) {
  return (
    coordinates.lat >= sanFranciscoBounds.minLat &&
    coordinates.lat <= sanFranciscoBounds.maxLat &&
    coordinates.lng >= sanFranciscoBounds.minLng &&
    coordinates.lng <= sanFranciscoBounds.maxLng
  );
}

async function loadEnvFile(filePath) {
  try {
    const fileContents = await fs.readFile(filePath, "utf8");

    for (const line of fileContents.split("\n")) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine.slice(separatorIndex + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

function wait(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
