import { format, formatDistanceToNow } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PlayIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { parseUTCDate } from '@/lib/utils'
import { api } from '@/lib/api'
import { useJob } from '@/hooks/use-job'
import { useRuns } from '@/hooks/use-runs'
import { RunsTable } from './components/runs-table'

interface JobDetailProps {
  jobId: number
}

export function JobDetail({ jobId }: JobDetailProps) {
  const queryClient = useQueryClient()
  const { data: job, isLoading: jobLoading } = useJob(jobId)
  const { data: runs, isLoading: runsLoading } = useRuns(jobId)

  const scraperUrl = import.meta.env.VITE_SCRAPER_URL || 'http://localhost:8788'

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${scraperUrl}/trigger`)
      const text = await response.text()
      if (!response.ok) throw new Error(text)
      return text
    },
    onSuccess: (message) => {
      toast.success(message)
      queryClient.invalidateQueries({ queryKey: ['runs'] })
    },
    onError: (error) => {
      toast.error(`Trigger failed: ${error.message}`)
    },
  })

  const frequencyMutation = useMutation({
    mutationFn: async (frequency_hours: number) => {
      const { data } = await api.put(`/api/jobs/${jobId}`, { frequency_hours })
      return data
    },
    onSuccess: () => {
      toast.success('Frequency updated')
      queryClient.invalidateQueries({ queryKey: ['jobs', jobId] })
    },
    onError: (error) => {
      toast.error(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    },
  })

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
        {jobLoading ? (
          <div className='space-y-4'>
            <Skeleton className='h-8 w-64' />
            <Skeleton className='h-48 w-full' />
          </div>
        ) : job ? (
          <div className='space-y-6'>
            <div className='flex items-center gap-3'>
              <h1 className='text-2xl font-bold tracking-tight'>{job.name}</h1>
              <Badge variant={job.enabled ? 'default' : 'secondary'}>
                {job.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <Button
                size='sm'
                variant='outline'
                onClick={() => triggerMutation.mutate()}
                disabled={triggerMutation.isPending}
                className='ms-auto'
              >
                {triggerMutation.isPending ? (
                  <Loader2Icon className='size-4 animate-spin' />
                ) : (
                  <PlayIcon className='size-4' />
                )}
                {triggerMutation.isPending ? 'Running...' : 'Run Now'}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 gap-x-12 gap-y-2 sm:grid-cols-2'>
                  <div className='flex justify-between'>
                    <span className='font-medium'>Type:</span>
                    <span className='text-muted-foreground'>{job.type}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='font-medium'>URL:</span>
                    <span className='text-muted-foreground truncate max-w-xs'>
                      {job.url || 'N/A'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='font-medium'>Frequency:</span>
                    <Select
                      value={String(job.frequency_hours)}
                      onValueChange={(value) => frequencyMutation.mutate(Number(value))}
                      disabled={frequencyMutation.isPending}
                    >
                      <SelectTrigger size='sm'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='1'>Every 1h</SelectItem>
                        <SelectItem value='2'>Every 2h</SelectItem>
                        <SelectItem value='3'>Every 3h</SelectItem>
                        <SelectItem value='4'>Every 4h</SelectItem>
                        <SelectItem value='6'>Every 6h</SelectItem>
                        <SelectItem value='12'>Every 12h</SelectItem>
                        <SelectItem value='24'>Every 24h</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='flex justify-between'>
                    <span className='font-medium'>Created:</span>
                    <span className='text-muted-foreground'>
                      {format(parseUTCDate(job.created_at), 'PPp')}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='font-medium'>Last Run:</span>
                    <span className='text-muted-foreground'>
                      {job.last_run_at
                        ? formatDistanceToNow(parseUTCDate(job.last_run_at), { addSuffix: true })
                        : 'Never'}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='font-medium'>Next Run:</span>
                    {!job.enabled ? (
                      <span className='text-muted-foreground'>Disabled</span>
                    ) : !job.next_run_at ? (
                      <span className='text-muted-foreground'>—</span>
                    ) : (
                      <span className={
                        parseUTCDate(job.next_run_at) < new Date()
                          ? 'text-orange-500'
                          : 'text-green-600 dark:text-green-400'
                      }>
                        {formatDistanceToNow(parseUTCDate(job.next_run_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className='text-xl font-bold mb-4'>Run History</h2>
              {runsLoading ? (
                <Skeleton className='h-48 w-full' />
              ) : runs ? (
                <RunsTable runs={runs} />
              ) : (
                <p className='text-muted-foreground'>No runs found.</p>
              )}
            </div>
          </div>
        ) : (
          <p className='text-muted-foreground'>Job not found.</p>
        )}
      </Main>
    </>
  )
}
