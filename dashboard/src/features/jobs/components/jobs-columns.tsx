import { type ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table'
import type { Job } from '@/lib/types'
import { parseUTCDate } from '@/lib/utils'

export const jobsColumns: ColumnDef<Job>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Name' />
    ),
    cell: ({ row }) => (
      <div className='font-medium'>{row.getValue('name')}</div>
    ),
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Type' />
    ),
    cell: ({ row }) => (
      <Badge variant='outline'>{row.getValue('type')}</Badge>
    ),
  },
  {
    accessorKey: 'url',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='URL' />
    ),
    cell: ({ row }) => {
      const url = row.getValue('url') as string | null
      return (
        <div className='max-w-xs truncate'>
          {url || 'N/A'}
        </div>
      )
    },
  },
  {
    accessorKey: 'frequency_hours',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Frequency' />
    ),
    cell: ({ row }) => (
      <div>{row.getValue('frequency_hours')}h</div>
    ),
  },
  {
    accessorKey: 'last_run_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Last Run' />
    ),
    cell: ({ row }) => {
      const lastRunAt = row.getValue('last_run_at') as string | null
      if (!lastRunAt) return <span className='text-muted-foreground'>Never</span>
      return (
        <span className='text-muted-foreground'>
          {formatDistanceToNow(parseUTCDate(lastRunAt), { addSuffix: true })}
        </span>
      )
    },
  },
  {
    accessorKey: 'next_run_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Next Run' />
    ),
    cell: ({ row }) => {
      const nextRunAt = row.getValue('next_run_at') as string | null
      const enabled = row.original.enabled

      if (!enabled) return <span className='text-muted-foreground'>Disabled</span>
      if (!nextRunAt) return <span className='text-muted-foreground'>—</span>

      const nextDate = parseUTCDate(nextRunAt)
      const isOverdue = nextDate < new Date()

      return (
        <span className={isOverdue ? 'text-orange-500' : 'text-green-600 dark:text-green-400'}>
          {formatDistanceToNow(nextDate, { addSuffix: true })}
        </span>
      )
    },
  },
  {
    accessorKey: 'enabled',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const enabled = row.getValue('enabled') as boolean
      return (
        <Badge variant={enabled ? 'default' : 'secondary'}>
          {enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Link to='/jobs/$jobId' params={{ jobId: String(row.original.id) }}>
        <Button variant='ghost' size='sm'>
          View
        </Button>
      </Link>
    ),
  },
]
