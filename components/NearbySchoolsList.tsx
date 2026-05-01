import { useEffect, useRef } from "react";
import type {
  CommuteResultsBySchoolId,
  Coordinates,
  CoordinatesBySchoolId,
  SearchMode,
  School
} from "@/types/school";
import { cn } from "@/lib/classNames";
import { Card } from "@/components/ui/Card";
import {
  getDistanceMilesBetweenCoordinates,
  SCHOOL_TYPE_LABELS
} from "@/lib/schoolUtils";

type NearbySchoolsListProps = {
  centerCoordinates?: Coordinates;
  centerSchool?: School;
  commuteResults: CommuteResultsBySchoolId;
  homeCoordinates?: Coordinates;
  isLoadingCommute?: boolean;
  searchMode: SearchMode;
  schoolNumberMap: Record<string, number>;
  schoolCoordinatesMap: CoordinatesBySchoolId;
  schools: School[];
  selectedSchoolId?: string;
  onSelectSchool: (school: School) => void;
};

export function NearbySchoolsList({
  centerCoordinates,
  centerSchool,
  commuteResults,
  homeCoordinates,
  isLoadingCommute = false,
  searchMode,
  schoolNumberMap,
  schoolCoordinatesMap,
  schools,
  selectedSchoolId,
  onSelectSchool
}: NearbySchoolsListProps) {
  const listContainerRef = useRef<HTMLDivElement>(null);
  const schoolItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!selectedSchoolId) {
      return;
    }

    const selectedSchoolElement = schoolItemRefs.current[selectedSchoolId];

    if (!selectedSchoolElement) {
      return;
    }

    window.requestAnimationFrame(() => {
      selectedSchoolElement.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }, [selectedSchoolId]);

  return (
    <Card className="flex h-full min-h-0 flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">
          {searchMode === "school" && centerSchool
            ? `Schools near ${centerSchool.name}`
            : "Nearby schools"}
        </h2>
        <span className="text-sm text-slate-500">{schools.length} in radius</span>
      </div>

      {isLoadingCommute ? (
        <div className="mb-3 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-accent">
          Updating commute times...
        </div>
      ) : null}

      <div
        ref={listContainerRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
      >
        {schools.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
            No schools match this radius and type.
          </div>
        ) : null}

        {schools.map((school) => {
          const isSelected = school.id === selectedSchoolId;
          const commuteResult = commuteResults[school.id];
          const distanceMiles = getDistanceMilesBetweenCoordinates(
            searchMode === "school" ? centerCoordinates : homeCoordinates,
            schoolCoordinatesMap[school.id]
          );
          const commuteMinutes = commuteResult?.transitMinutes;

          return (
            <button
              key={school.id}
              ref={(element) => {
                schoolItemRefs.current[school.id] = element;
              }}
              type="button"
              onClick={() => {
                onSelectSchool(school);
              }}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition",
                isSelected
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        isSelected
                          ? "bg-accent text-white"
                          : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {schoolNumberMap[school.id] ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-950">
                        {school.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {SCHOOL_TYPE_LABELS[school.type]} ·{" "}
                        {Number.isFinite(distanceMiles)
                          ? `${distanceMiles.toFixed(1)} miles`
                          : "Distance unavailable"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm">
                  {typeof commuteMinutes === "number"
                    ? `${commuteMinutes} min`
                    : "—"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
