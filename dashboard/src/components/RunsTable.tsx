import { Link } from '@tanstack/react-router';
import { useRuns } from '@/hooks/useRuns';
import { useJobs } from '@/hooks/useJobs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, formatDistanceToNow } from 'date-fns';

interface RunsTableProps {
  jobId?: number;
}

export function RunsTable({ jobId }: RunsTableProps) {
  const { data: runs, isLoading: runsLoading } = useRuns(jobId);
  const { data: jobs } = useJobs();

  const getJobName = (jobId: number) => {
    return jobs?.find((j) => j.id === jobId)?.name || `Job #${jobId}`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'running':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (runsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No runs found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Runs</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {!jobId && <TableHead>Job</TableHead>}
              <TableHead>Started</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Products</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => {
              const startedAt = new Date(run.started_at);
              const completedAt = run.completed_at ? new Date(run.completed_at) : null;
              const duration = completedAt
                ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
                : null;

              return (
                <TableRow key={run.id}>
                  {!jobId && (
                    <TableCell>
                      <Link
                        to="/dashboard/jobs/$jobId"
                        params={{ jobId: String(run.job_id) }}
                        className="hover:underline"
                      >
                        {getJobName(run.job_id)}
                      </Link>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm">{format(startedAt, 'PPp')}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(startedAt, { addSuffix: true })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {completedAt ? (
                      <div className="space-y-1">
                        <p className="text-sm">{format(completedAt, 'PPp')}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(completedAt, { addSuffix: true })}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Running...</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {duration !== null ? `${duration}s` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(run.status)}>{run.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {run.products_found !== null ? run.products_found : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to="/dashboard/runs/$runId" params={{ runId: String(run.id) }}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
