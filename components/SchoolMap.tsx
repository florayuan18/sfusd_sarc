import type { School } from "@/types/school";
import { cn } from "@/lib/classNames";

type SchoolMapProps = {
  schools: School[];
  selectedSchoolId?: string;
  onSelectSchool: (school: School) => void;
};

export function SchoolMap({
  schools,
  selectedSchoolId,
  onSelectSchool
}: SchoolMapProps) {
  return (
    <section className="relative min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-soft">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,0.16)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-6 rounded-2xl border border-dashed border-slate-300 bg-white/70" />
      <div className="absolute left-6 top-6 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
        Map
      </div>
      <div className="absolute bottom-6 left-6 max-w-xs rounded-xl bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur">
        Google Maps will be integrated in PASS 2. Pins are mocked for UI
        behavior.
      </div>

      {schools.map((school) => {
        const isSelected = school.id === selectedSchoolId;

        return (
          <button
            key={school.id}
            type="button"
            onClick={() => onSelectSchool(school)}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${school.mapPosition.x}%`,
              top: `${school.mapPosition.y}%`
            }}
            aria-label={`Select ${school.name}`}
          >
            <span
              className={cn(
                "block h-5 w-5 rounded-full border-4 shadow-lg transition",
                isSelected
                  ? "scale-125 border-blue-200 bg-accent"
                  : "border-white bg-blue-500 hover:scale-110"
              )}
            />
            <span className="pointer-events-none absolute bottom-7 left-1/2 hidden w-max -translate-x-1/2 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
              {school.name}
            </span>
          </button>
        );
      })}
    </section>
  );
}
