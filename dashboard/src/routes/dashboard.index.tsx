import { createFileRoute } from '@tanstack/react-router';
import { useJobs } from '@/hooks/useJobs';
import { useRuns } from '@/hooks/useRuns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/dashboard/')({
  component: DashboardHome,
});

function DashboardHome() {
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const { data: runs, isLoading: runsLoading } = useRuns();

  const enabledJobs = jobs?.filter(j => j.enabled).length ?? 0;
  const totalRuns = runs?.length ?? 0;
  const successfulRuns = runs?.filter(r => r.status === 'success').length ?? 0;
  const failedRuns = runs?.filter(r => r.status === 'failed').length ?? 0;
  const successRate = totalRuns > 0 ? ((successfulRuns / totalRuns) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your scraper jobs and runs</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{jobs?.length ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">{enabledJobs} enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalRuns}</div>
            )}
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{successRate}%</div>
            )}
            <p className="text-xs text-muted-foreground">{successfulRuns} successful</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{failedRuns}</div>
            )}
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
