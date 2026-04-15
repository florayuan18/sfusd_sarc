import type {
  RawSfusdSchool,
  School,
  SchoolCounts,
  SchoolFilter,
  SchoolType
} from "@/types/school";

export const SCHOOL_FILTERS: SchoolFilter[] = [
  "all",
  "elementary",
  "middle",
  "high"
];

export const SCHOOL_FILTER_LABELS: Record<SchoolFilter, string> = {
  all: "All",
  elementary: "Elementary",
  middle: "Middle",
  high: "High"
};

export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  elementary: "Elementary",
  middle: "Middle",
  high: "High",
  other: "Other"
};

export function normalizeSchools(
  rawSchools: readonly RawSfusdSchool[]
): School[] {
  return rawSchools.map((school, index) => {
    const type = getSchoolTypeFromGradeLevels(school.gradeLevels);
    const commute = getMockCommute(index, type);

    return {
      ...school,
      id: String(school.id),
      type,
      description: getSchoolDescription(type, school.gradeLevels),
      distanceMiles: Number((0.7 + (index % 12) * 0.34).toFixed(1)),
      commuteFit: Math.max(52, 94 - (index % 14) * 3),
      commute
    };
  });
}

export function getSchoolTypeFromGradeLevels(
  gradeLevels: RawSfusdSchool["gradeLevels"]
): SchoolType {
  const gradeText = getGradeLevelsText(gradeLevels);
  const normalizedGradeText = gradeText.toUpperCase();

  if (
    /(COUNTY SCHOOL|EARLY EDUCATION)/.test(normalizedGradeText) &&
    !/(ELEMENTARY SCHOOL|MIDDLE SCHOOL|HIGH SCHOOL|K-8)/.test(
      normalizedGradeText
    )
  ) {
    return "other";
  }

  if (/HIGH SCHOOL/.test(normalizedGradeText)) {
    return "high";
  }

  if (/(MIDDLE SCHOOL|K-8)/.test(normalizedGradeText)) {
    return "middle";
  }

  if (/ELEMENTARY SCHOOL/.test(normalizedGradeText)) {
    return "elementary";
  }

  const normalizedGrades = normalizeGradeLevels(gradeLevels);

  if (normalizedGrades.some((grade) => grade >= 9 && grade <= 12)) {
    return "high";
  }

  if (normalizedGrades.some((grade) => grade >= 6 && grade <= 8)) {
    return "middle";
  }

  if (normalizedGrades.some((grade) => grade >= -1 && grade <= 5)) {
    return "elementary";
  }

  return "other";
}

export function getFilteredSchools(
  schools: School[],
  selectedFilter: SchoolFilter
) {
  if (selectedFilter === "all") {
    return schools;
  }

  return schools.filter((school) => school.type === selectedFilter);
}

export function getSchoolCounts(schools: School[]): SchoolCounts {
  return schools.reduce<SchoolCounts>(
    (counts, school) => {
      if (school.type === "other") {
        return {
          ...counts,
          all: counts.all + 1,
          other: counts.other + 1
        };
      }

      return {
        ...counts,
        all: counts.all + 1,
        [school.type]: counts[school.type] + 1
      };
    },
    {
      all: 0,
      elementary: 0,
      middle: 0,
      high: 0,
      other: 0
    }
  );
}

export function getInitialSchoolForFilter(
  schools: School[],
  selectedFilter: SchoolFilter
) {
  return getFilteredSchools(schools, selectedFilter)[0];
}

function normalizeGradeLevels(gradeLevels: RawSfusdSchool["gradeLevels"]) {
  const gradeText = getGradeLevelsText(gradeLevels);

  return gradeText
    .toUpperCase()
    .replace(/PRE[-\s]?K|PK/g, "PK")
    .replace(/KINDERGARTEN/g, "K")
    .match(/TK|PK|K|[0-9]{1,2}/g)
    ?.map((grade) => {
      if (grade === "PK") {
        return -2;
      }

      if (grade === "TK" || grade === "K") {
        return -1;
      }

      return Number(grade);
    })
    .filter((grade) => Number.isFinite(grade)) ?? [];
}

function getMockCommute(index: number, type: SchoolType) {
  const typeOffset: Record<SchoolType, number> = {
    elementary: 0,
    middle: 3,
    high: 5,
    other: 7
  };

  const offset = typeOffset[type] + (index % 7);

  return {
    walkingMinutes: 14 + offset * 3,
    drivingMinutes: 5 + Math.floor(offset / 2),
    transitMinutes: 12 + offset * 2
  };
}

function getSchoolDescription(
  type: SchoolType,
  gradeLevels: RawSfusdSchool["gradeLevels"]
) {
  const gradeLabel = getGradeLevelsText(gradeLevels);

  if (type === "other") {
    return `An SFUSD program serving ${gradeLabel}. Commute and map details are shown for planning only.`;
  }

  return `An SFUSD ${SCHOOL_TYPE_LABELS[type].toLowerCase()} school serving ${gradeLabel}. Commute values are mock estimates for this PASS 2 demo.`;
}

function getGradeLevelsText(
  gradeLevels: RawSfusdSchool["gradeLevels"]
): string {
  return typeof gradeLevels === "string" ? gradeLevels : gradeLevels.join(" ");
}
