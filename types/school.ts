export type SchoolType = "Elementary" | "Middle" | "High";

export type School = {
  id: string;
  name: string;
  type: SchoolType;
  lat: number;
  lng: number;
  description: string;
  distanceMiles: number;
  commuteFit: number;
  commute: {
    walkingMinutes: number;
    drivingMinutes: number;
    transitMinutes: number;
  };
  mapPosition: {
    x: number;
    y: number;
  };
};

export type SchoolFilter = "All" | SchoolType;

export type SchoolCounts = Record<SchoolFilter, number>;
