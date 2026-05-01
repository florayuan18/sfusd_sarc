import type { CommuteResult, Coordinates, School } from "@/types/school";
import { CommuteMetrics } from "@/components/CommuteMetrics";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getDistanceMilesBetweenCoordinates,
  SCHOOL_TYPE_LABELS
} from "@/lib/schoolUtils";

type SchoolProfileCardProps = {
  centerCoordinates?: Coordinates;
  centerSchool?: School;
  commuteResult?: CommuteResult;
  isLoadingCommute?: boolean;
  isSchoolSearchMode?: boolean;
  school: School;
  isNearest?: boolean;
  selectedFilter?: string;
  showCommutePrompt?: boolean;
};

export function SchoolProfileCard({
  centerCoordinates,
  centerSchool,
  commuteResult,
  isLoadingCommute = false,
  isSchoolSearchMode = false,
  school,
  isNearest = false,
  selectedFilter = "",
  showCommutePrompt = false
}: SchoolProfileCardProps) {
  const distanceMiles = showCommutePrompt
    ? null
    : commuteResult?.distanceMiles ?? null;
  const schoolTypeLabel = SCHOOL_TYPE_LABELS[school.type];
  const nearestLabel = isNearest
    ? selectedFilter === "all"
      ? "Nearest school"
      : `Nearest ${schoolTypeLabel}`
    : schoolTypeLabel;
  const showTypeDetail = isNearest && selectedFilter === "all";
  const distanceFromCenterMiles =
    isSchoolSearchMode && centerSchool && centerCoordinates
      ? getDistanceMilesBetweenCoordinates(centerCoordinates, school.coordinates)
      : null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-accent">
            {nearestLabel}
          </div>
          {isSchoolSearchMode && centerSchool && school.id === centerSchool.id ? (
            <div className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
              Search centered on this school
            </div>
          ) : null}
          {showTypeDetail ? (
            <div className="mt-1 text-sm text-slate-500">
              {schoolTypeLabel}
            </div>
          ) : null}
          {isSchoolSearchMode && centerSchool && school.id !== centerSchool.id ? (
            <div className="mt-1 text-sm text-slate-500">
              {Number.isFinite(distanceFromCenterMiles)
                ? `${distanceFromCenterMiles?.toFixed(1)} miles from ${centerSchool.name}`
                : `Distance from ${centerSchool.name} unavailable`}
            </div>
          ) : null}
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            {school.name}
          </h2>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-accent">
          {typeof distanceMiles === "number" ? `${distanceMiles.toFixed(1)} mi` : "—"}
        </div>
      </div>

      <div className="mt-4">
        <CommuteMetrics
          commuteResult={commuteResult}
          isLoading={isLoadingCommute}
          school={school}
          showPrompt={showCommutePrompt}
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {school.description}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button size="sm">View full school profile</Button>
        <Button size="sm" variant="secondary">Compare</Button>
      </div>
    </Card>
  );
}
