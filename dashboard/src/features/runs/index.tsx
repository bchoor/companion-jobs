import { format, formatDistanceToNow } from 'date-fns'
import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useRun } from '@/hooks/use-run'
import { useResult } from '@/hooks/use-result'
import { useJob } from '@/hooks/use-job'
import { parseUTCDate } from '@/lib/utils'
import type { Run } from '@/lib/types'

interface RunDetailProps {
  runId: number
}

export function RunDetail({ runId }: RunDetailProps) {
  const { data: run, isLoading: runLoading } = useRun(runId)
  const { data: result, isLoading: resultLoading } = useResult(runId)
  const { data: job, isLoading: jobLoading } = useJob(run?.job_id ?? 0)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787'

  const getStatusVariant = (status: Run['status']) => {
    switch (status) {
      case 'success':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'running':
        return 'secondary'
      case 'pending':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const calculateDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return 'N/A'
    const start = parseUTCDate(startedAt).getTime()
    const end = parseUTCDate(completedAt).getTime()
    const durationSeconds = Math.round((end - start) / 1000)
    return `${durationSeconds}s`
  }

  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {runLoading ? (
          <div className='space-y-4'>
            <Skeleton className='h-8 w-64' />
            <Skeleton className='h-48 w-full' />
          </div>
        ) : run ? (
          <div className='space-y-6'>
            <div className='flex items-center gap-3'>
              <h1 className='text-2xl font-bold tracking-tight'>Run #{run.id}</h1>
              <Badge variant={getStatusVariant(run.status)}>
                {run.status}
              </Badge>
            </div>

            {!jobLoading && job && (
              <div className='text-sm text-muted-foreground'>
                Job:{' '}
                <Link
                  to='/jobs/$jobId'
                  params={{ jobId: String(job.id) }}
                  className='text-primary hover:underline'
                >
                  {job.name}
                </Link>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Run Details</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-2'>
                  <div className='flex justify-between'>
                    <span className='font-medium'>Started At:</span>
                    <div className='text-right'>
                      <div className='text-muted-foreground'>
                        {format(parseUTCDate(run.started_at), 'PPp')}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {formatDistanceToNow(parseUTCDate(run.started_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className='flex justify-between'>
                    <span className='font-medium'>Completed At:</span>
                    <span className='text-muted-foreground'>
                      {run.completed_at
                        ? format(parseUTCDate(run.completed_at), 'PPp')
                        : 'Running...'}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='font-medium'>Duration:</span>
                    <span className='text-muted-foreground'>
                      {calculateDuration(run.started_at, run.completed_at)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='font-medium'>Products Found:</span>
                    <span className='text-muted-foreground'>
                      {run.products_found ?? '-'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {run.error_message && (
              <Card>
                <CardHeader>
                  <CardTitle className='text-destructive'>Error Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className='rounded-md bg-destructive/10 p-4 text-sm overflow-x-auto border border-destructive/20'>
                    {run.error_message}
                  </pre>
                </CardContent>
              </Card>
            )}

            {run.screenshot_file && (
              <Card>
                <CardHeader>
                  <CardTitle>Screenshot</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={`${apiUrl}/api/files/${run.screenshot_file}`}
                    alt='Run screenshot'
                    className='w-full rounded-md border'
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Result Data</CardTitle>
              </CardHeader>
              <CardContent>
                {resultLoading ? (
                  <Skeleton className='h-48 w-full' />
                ) : result ? (
                  <pre className='rounded-md bg-muted p-4 text-sm whitespace-pre-wrap break-words'>
                    {JSON.stringify(
                      typeof result.data === 'string'
                        ? JSON.parse(result.data)
                        : result.data,
                      null,
                      2
                    )}
                  </pre>
                ) : (
                  <p className='text-muted-foreground'>No result data available.</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className='text-muted-foreground'>Run not found.</p>
        )}
      </Main>
    </>
  )
}
