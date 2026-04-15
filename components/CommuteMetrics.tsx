import type { School } from "@/types/school";

type CommuteMetricsProps = {
  school: School;
};

export function CommuteMetrics({ school }: CommuteMetricsProps) {
  const metrics = [
    {
      label: "Walk",
      value: school.commute.walkingMinutes
    },
    {
      label: "Drive",
      value: school.commute.drivingMinutes
    },
    {
      label: "Muni",
      value: school.commute.transitMinutes
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {metric.label}
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-950">
            {metric.value}
            <span className="ml-1 text-sm font-medium text-slate-500">min</span>
          </div>
        </div>
      ))}
    </div>
  );
}
