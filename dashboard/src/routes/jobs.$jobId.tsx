import { createFileRoute, Link } from '@tanstack/react-router';
import { useJob } from '@/hooks/useJob';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RunsTable } from '@/components/RunsTable';
import { AppShell } from '@/components/layout/AppShell';
import { format } from 'date-fns';

export const Route = createFileRoute('/jobs/$jobId')({
  component: JobDetailPage,
});

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const { data: job, isLoading: jobLoading } = useJob(Number(jobId));

  if (jobLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Job not found</h1>
          <Link to="/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{job.name}</h1>
            <p className="text-muted-foreground">Job #{job.id}</p>
          </div>
          <Badge variant={job.enabled ? 'default' : 'secondary'}>
            {job.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Configuration and metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="text-sm">{job.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                <p className="text-sm">Every {job.frequency_hours} hours</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">URL</p>
                <p className="text-sm truncate">{job.url || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{format(new Date(job.created_at), 'PPp')}</p>
              </div>
            </div>
            {job.config && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Config</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(job.config, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Run History</h2>
          <RunsTable jobId={Number(jobId)} />
        </div>
      </div>
    </AppShell>
  );
}
