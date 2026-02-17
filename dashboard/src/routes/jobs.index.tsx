import { createFileRoute } from '@tanstack/react-router';
import { JobsTable } from '@/components/JobsTable';
import { AppShell } from '@/components/layout/AppShell';

export const Route = createFileRoute('/jobs/')({
  component: JobsPage,
});

function JobsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">Manage your scraper jobs</p>
        </div>
        <JobsTable />
      </div>
    </AppShell>
  );
}
