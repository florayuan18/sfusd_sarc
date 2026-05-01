export type SchoolType = "elementary" | "middle" | "high" | "other";

export type SchoolFilter = "all" | "elementary" | "middle" | "high";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type CoordinatesBySchoolId = Record<string, Coordinates>;

export type RadiusMinutes = 10 | 20 | 30;

export type SearchMode = "address" | "school";

export type CommuteFit = "High" | "Medium" | "Low";

export type CommuteMode = "transit" | "driving" | "walking" | "biking";

export type CommuteResult = {
  schoolId: string;
  distanceMiles: number | null;
  drivingMinutes: number | null;
  walkingMinutes: number | null;
  bikingMinutes: number | null;
  transitMinutes: number | null;
  transitLabel: string;
  commuteFit: CommuteFit;
};

export type CommuteResultsBySchoolId = Record<string, CommuteResult>;

export type CommuteDestination = {
  schoolId: string;
  coordinates: Coordinates;
};

export type RawSfusdSchool = {
  id: string | number;
  name: string;
  gradeLevels: readonly string[] | string;
  address: string;
  lat?: number;
  lng?: number;
};

export type School = {
  id: string;
  name: string;
  gradeLevels: readonly string[] | string;
  address: string;
  coordinates?: Coordinates;
  type: SchoolType;
  description: string;
  distanceMiles: number;
  commuteFit: number;
  commute: {
    walkingMinutes: number;
    drivingMinutes: number;
    transitMinutes: number;
  };
};

export type SchoolCounts = Record<SchoolFilter, number> & {
  other: number;
};
