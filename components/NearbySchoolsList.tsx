import type { School } from "@/types/school";
import { cn } from "@/lib/classNames";
import { Card } from "@/components/ui/Card";

type NearbySchoolsListProps = {
  schools: School[];
  selectedSchoolId?: string;
  onSelectSchool: (school: School) => void;
};

export function NearbySchoolsList({
  schools,
  selectedSchoolId,
  onSelectSchool
}: NearbySchoolsListProps) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">
          Nearby schools
        </h2>
        <span className="text-sm text-slate-500">Top {schools.length}</span>
      </div>

      <div className="space-y-2">
        {schools.map((school) => {
          const isSelected = school.id === selectedSchoolId;

          return (
            <button
              key={school.id}
              type="button"
              onClick={() => onSelectSchool(school)}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition",
                isSelected
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-950">
                    {school.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {school.type} · {school.distanceMiles.toFixed(1)} miles
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm">
                  {school.commute.drivingMinutes} min
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
