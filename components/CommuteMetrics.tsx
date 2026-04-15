import type { CommuteResult, School } from "@/types/school";

type CommuteMetricsProps = {
  commuteResult?: CommuteResult;
  isLoading?: boolean;
  school: School;
};

export function CommuteMetrics({
  commuteResult,
  isLoading = false,
  school
}: CommuteMetricsProps) {
  const metrics = [
    {
      label: "Walk",
      value: commuteResult?.walkingMinutes ?? school.commute.walkingMinutes
    },
    {
      label: "Bike",
      value: commuteResult?.bikingMinutes
    },
    {
      label: "Drive",
      value: commuteResult?.drivingMinutes ?? school.commute.drivingMinutes
    },
    {
      label: commuteResult?.transitLabel ?? "Muni",
      value: commuteResult?.transitMinutes ?? school.commute.transitMinutes
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {metric.label}
          </div>
          {isLoading && metric.value === undefined ? (
            <div className="mt-2 h-6 w-14 animate-pulse rounded bg-slate-200" />
          ) : (
            <div className="mt-1 text-xl font-semibold text-slate-950">
              {formatMinutes(metric.value)}
              {typeof metric.value === "number" ? (
                <span className="ml-1 text-sm font-medium text-slate-500">
                  min
                </span>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatMinutes(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "—";
  }

  return value;
}
