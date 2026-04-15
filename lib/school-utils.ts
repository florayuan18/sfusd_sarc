import type { School, SchoolCounts, SchoolFilter } from "@/types/school";

export const SCHOOL_FILTERS: SchoolFilter[] = [
  "All",
  "Elementary",
  "Middle",
  "High"
];

export function getFilteredSchools(
  schools: School[],
  selectedFilter: SchoolFilter
) {
  if (selectedFilter === "All") {
    return schools;
  }

  return schools.filter((school) => school.type === selectedFilter);
}

export function getSchoolCounts(schools: School[]): SchoolCounts {
  return schools.reduce<SchoolCounts>(
    (counts, school) => ({
      ...counts,
      All: counts.All + 1,
      [school.type]: counts[school.type] + 1
    }),
    {
      All: 0,
      Elementary: 0,
      Middle: 0,
      High: 0
    }
  );
}

export function getInitialSchoolForFilter(
  schools: School[],
  selectedFilter: SchoolFilter
) {
  return getFilteredSchools(schools, selectedFilter)[0];
}
