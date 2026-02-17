import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { Run, Result } from '@/lib/types';

interface RunDetailProps {
  run: Run;
  result?: Result;
  resultLoading: boolean;
}

export function RunDetail({ run, result, resultLoading }: RunDetailProps) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run Details</CardTitle>
          <CardDescription>Execution metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Started At</p>
              <p className="text-sm">{format(new Date(run.started_at), 'PPpp')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed At</p>
              <p className="text-sm">
                {run.completed_at ? format(new Date(run.completed_at), 'PPpp') : 'Running...'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Duration</p>
              <p className="text-sm">
                {run.completed_at
                  ? `${Math.round(
                      (new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000
                    )}s`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Products Found</p>
              <p className="text-sm">{run.products_found ?? 'N/A'}</p>
            </div>
          </div>
          {run.error_message && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Error Message</p>
              <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded overflow-x-auto">
                {run.error_message}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {run.screenshot_file && (
        <Card>
          <CardHeader>
            <CardTitle>Screenshot</CardTitle>
            <CardDescription>Page capture at run time</CardDescription>
          </CardHeader>
          <CardContent>
            <img
              src={`${apiUrl}/api/files/${run.screenshot_file}`}
              alt="Screenshot"
              className="w-full rounded border"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Result Data</CardTitle>
          <CardDescription>Extracted information</CardDescription>
        </CardHeader>
        <CardContent>
          {resultLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : result ? (
            <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-96">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          ) : (
            <p className="text-muted-foreground">No result data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
