import { createFileRoute, Link } from '@tanstack/react-router';
import { useRun } from '@/hooks/useRun';
import { useResult } from '@/hooks/useResult';
import { useJob } from '@/hooks/useJob';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RunDetail } from '@/components/RunDetail';

export const Route = createFileRoute('/dashboard/runs/$runId')({
  component: RunDetailPage,
});

function RunDetailPage() {
  const { runId } = Route.useParams();
  const { data: run, isLoading: runLoading } = useRun(Number(runId));
  const { data: result, isLoading: resultLoading } = useResult(Number(runId));
  const { data: job } = useJob(run?.job_id ?? 0);

  if (runLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Run not found</h1>
        <Link to="/dashboard/jobs">
          <Button>Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  const statusVariant = run.status === 'success'
    ? 'default'
    : run.status === 'failed'
    ? 'destructive'
    : run.status === 'running'
    ? 'secondary'
    : 'outline';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Run #{run.id}</h1>
          <p className="text-muted-foreground">
            {job ? (
              <Link to="/dashboard/jobs/$jobId" params={{ jobId: String(job.id) }} className="hover:underline">
                {job.name}
              </Link>
            ) : (
              `Job #${run.job_id}`
            )}
          </p>
        </div>
        <Badge variant={statusVariant}>{run.status}</Badge>
      </div>

      <RunDetail run={run} result={result} resultLoading={resultLoading} />
    </div>
  );
}
