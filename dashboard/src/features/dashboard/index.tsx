import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useJobs } from '@/hooks/use-jobs'
import { useRuns } from '@/hooks/use-runs'
import { Briefcase, Activity, CheckCircle, XCircle } from 'lucide-react'

export function Dashboard() {
  const { data: jobs, isLoading: jobsLoading } = useJobs()
  const { data: runs, isLoading: runsLoading } = useRuns()

  const totalJobs = jobs?.length ?? 0
  const enabledJobs = jobs?.filter(j => j.enabled).length ?? 0
  const totalRuns = runs?.length ?? 0
  const successfulRuns = runs?.filter(r => r.status === 'success').length ?? 0
  const failedRuns = runs?.filter(r => r.status === 'failed').length ?? 0
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0

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
        <div className='mb-6'>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <p className='text-muted-foreground'>
            Overview of your scraper jobs and runs
          </p>
        </div>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Jobs
              </CardTitle>
              <Briefcase className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <>
                  <Skeleton className='h-8 w-20 mb-1' />
                  <Skeleton className='h-4 w-24' />
                </>
              ) : (
                <>
                  <div className='text-2xl font-bold'>{totalJobs}</div>
                  <p className='text-xs text-muted-foreground'>
                    {enabledJobs} enabled
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Runs
              </CardTitle>
              <Activity className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {runsLoading ? (
                <>
                  <Skeleton className='h-8 w-20 mb-1' />
                  <Skeleton className='h-4 w-24' />
                </>
              ) : (
                <>
                  <div className='text-2xl font-bold'>{totalRuns}</div>
                  <p className='text-xs text-muted-foreground'>
                    All time
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Success Rate
              </CardTitle>
              <CheckCircle className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {runsLoading ? (
                <>
                  <Skeleton className='h-8 w-20 mb-1' />
                  <Skeleton className='h-4 w-24' />
                </>
              ) : (
                <>
                  <div className='text-2xl font-bold'>{successRate}%</div>
                  <p className='text-xs text-muted-foreground'>
                    {successfulRuns} successful
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Failed Runs
              </CardTitle>
              <XCircle className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {runsLoading ? (
                <>
                  <Skeleton className='h-8 w-20 mb-1' />
                  <Skeleton className='h-4 w-24' />
                </>
              ) : (
                <>
                  <div className='text-2xl font-bold'>{failedRuns}</div>
                  <p className='text-xs text-muted-foreground'>
                    Require attention
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
