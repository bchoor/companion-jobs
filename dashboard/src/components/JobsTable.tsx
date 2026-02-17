import { Link } from '@tanstack/react-router';
import { useJobs } from '@/hooks/useJobs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function JobsTable() {
  const { data: jobs, isLoading } = useJobs();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
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

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No jobs found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{job.type}</Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate">{job.url || 'N/A'}</TableCell>
                <TableCell>{job.frequency_hours}h</TableCell>
                <TableCell>
                  <Badge variant={job.enabled ? 'default' : 'secondary'}>
                    {job.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link to="/dashboard/jobs/$jobId" params={{ jobId: String(job.id) }}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
