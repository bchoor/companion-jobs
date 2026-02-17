import { createFileRoute } from '@tanstack/react-router';
import { JobsTable } from '@/components/JobsTable';

export const Route = createFileRoute('/dashboard/jobs/')({
  component: JobsPage,
});

function JobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Jobs</h1>
        <p className="text-muted-foreground">Manage your scraper jobs</p>
      </div>
      <JobsTable />
    </div>
  );
}
