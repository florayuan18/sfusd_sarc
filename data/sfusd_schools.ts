import sfusdSchoolsJson from "./sfusd_schools.json";
import type { RawSfusdSchool } from "@/types/school";

export const sfusdSchools = sfusdSchoolsJson as readonly RawSfusdSchool[];
