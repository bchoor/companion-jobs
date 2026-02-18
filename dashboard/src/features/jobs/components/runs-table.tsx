import { format, formatDistanceToNow } from 'date-fns'
import { Link } from '@tanstack/react-router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { parseUTCDate } from '@/lib/utils'
import type { Run } from '@/lib/types'

interface RunsTableProps {
  runs: Run[]
}

export function RunsTable({ runs }: RunsTableProps) {
  const sortedRuns = [...runs].sort((a, b) =>
    parseUTCDate(b.started_at).getTime() - parseUTCDate(a.started_at).getTime()
  )

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
    if (!completedAt) return '-'
    const start = parseUTCDate(startedAt).getTime()
    const end = parseUTCDate(completedAt).getTime()
    const durationSeconds = Math.round((end - start) / 1000)
    return `${durationSeconds}s`
  }

  return (
    <div className='overflow-hidden rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Started At</TableHead>
            <TableHead>Completed At</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Products Found</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRuns.length > 0 ? (
            sortedRuns.map((run) => (
              <TableRow key={run.id}>
                <TableCell>
                  <div className='flex flex-col'>
                    <span className='text-sm'>
                      {format(parseUTCDate(run.started_at), 'PPp')}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      {formatDistanceToNow(parseUTCDate(run.started_at), { addSuffix: true })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {run.completed_at
                    ? format(parseUTCDate(run.completed_at), 'PPp')
                    : 'Running...'}
                </TableCell>
                <TableCell>
                  {calculateDuration(run.started_at, run.completed_at)}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(run.status)}>
                    {run.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={run.trigger === 'manual' ? 'outline' : 'secondary'}>
                    {run.trigger ?? 'scheduled'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {run.products_found ?? '-'}
                </TableCell>
                <TableCell>
                  <Link to='/runs/$runId' params={{ runId: String(run.id) }}>
                    <Button variant='ghost' size='sm'>
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className='h-24 text-center'>
                No runs found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
