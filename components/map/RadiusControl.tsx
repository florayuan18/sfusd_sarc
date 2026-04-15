import { cn } from "@/lib/classNames";
import { RADIUS_OPTIONS } from "@/lib/mapConfig";
import type { RadiusMinutes } from "@/types/school";

type RadiusControlProps = {
  value: RadiusMinutes;
  onChange: (radiusMinutes: RadiusMinutes) => void;
};

export function RadiusControl({ value, onChange }: RadiusControlProps) {
  return (
    <div className="absolute right-6 top-6 rounded-2xl bg-white p-2 shadow-sm">
      <div className="flex gap-1">
        {RADIUS_OPTIONS.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => onChange(minutes)}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-semibold transition",
              value === minutes
                ? "bg-accent text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {minutes} min
          </button>
        ))}
      </div>
    </div>
  );
}
