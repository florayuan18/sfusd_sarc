import type { CommuteResult, School } from "@/types/school";
import { CommuteMetrics } from "@/components/CommuteMetrics";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SCHOOL_TYPE_LABELS } from "@/lib/schoolUtils";

type SchoolProfileCardProps = {
  commuteResult?: CommuteResult;
  isLoadingCommute?: boolean;
  school: School;
};

export function SchoolProfileCard({
  commuteResult,
  isLoadingCommute = false,
  school
}: SchoolProfileCardProps) {
  const distanceMiles = commuteResult?.distanceMiles ?? school.distanceMiles;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-accent">
            {SCHOOL_TYPE_LABELS[school.type]}
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            {school.name}
          </h2>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-accent">
          {distanceMiles.toFixed(1)} mi
        </div>
      </div>

      <div className="mt-5">
        <CommuteMetrics
          commuteResult={commuteResult}
          isLoading={isLoadingCommute}
          school={school}
        />
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-600">
        {school.description}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button>View full school profile</Button>
        <Button variant="secondary">Compare</Button>
      </div>
    </Card>
  );
}

