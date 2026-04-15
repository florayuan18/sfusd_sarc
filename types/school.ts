export type SchoolType = "elementary" | "middle" | "high" | "other";

export type SchoolFilter = "all" | "elementary" | "middle" | "high";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type CoordinatesBySchoolId = Record<string, Coordinates>;

export type RadiusMinutes = 10 | 20 | 30;

export type RawSfusdSchool = {
  id: string | number;
  name: string;
  gradeLevels: readonly string[] | string;
  address: string;
};

export type School = {
  id: string;
  name: string;
  gradeLevels: readonly string[] | string;
  address: string;
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
