import { Link } from '@tanstack/react-router';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
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

type Run = {
  id: number;
  job_id: number;
  started_at: string;
  completed_at: string | null;
  status: string;
  products_found: number | null;
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

export function RunsTable({ jobId }: RunsTableProps) {
  const { data: runs, isLoading: runsLoading } = useRuns(jobId);
  const { data: jobs } = useJobs();
  const [sorting, setSorting] = useState<SortingState>([]);

  const getJobName = (jobId: number) => {
    return jobs?.find((j) => j.id === jobId)?.name || `Job #${jobId}`;
  };

  const columnHelper = createColumnHelper<Run>();

  const columns = useMemo(() => {
    const baseColumns = [];

    if (!jobId) {
      baseColumns.push(
        columnHelper.accessor('job_id', {
          header: 'Job',
          cell: (info) => (
            <Link
              to="/jobs/$jobId"
              params={{ jobId: String(info.getValue()) }}
              className="hover:underline font-medium"
            >
              {getJobName(info.getValue())}
            </Link>
          ),
        })
      );
    }

    baseColumns.push(
      columnHelper.accessor('started_at', {
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="-ml-4"
            >
              Started
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: (info) => {
          const startedAt = new Date(info.getValue());
          return (
            <div className="space-y-1">
              <p className="text-sm">{format(startedAt, 'PPp')}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(startedAt, { addSuffix: true })}
              </p>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const dateA = new Date(rowA.original.started_at).getTime();
          const dateB = new Date(rowB.original.started_at).getTime();
          return dateA - dateB;
        },
      }),
      columnHelper.accessor('completed_at', {
        header: 'Completed',
        cell: (info) => {
          const completedAt = info.getValue() ? new Date(info.getValue()!) : null;
          return completedAt ? (
            <div className="space-y-1">
              <p className="text-sm">{format(completedAt, 'PPp')}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(completedAt, { addSuffix: true })}
              </p>
            </div>
          ) : (
            <span className="text-muted-foreground">Running...</span>
          );
        },
      }),
      columnHelper.display({
        id: 'duration',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="-ml-4"
            >
              Duration
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: (info) => {
          const startedAt = new Date(info.row.original.started_at);
          const completedAt = info.row.original.completed_at
            ? new Date(info.row.original.completed_at)
            : null;
          const duration = completedAt
            ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
            : null;
          return <div>{duration !== null ? `${duration}s` : '-'}</div>;
        },
        sortingFn: (rowA, rowB) => {
          const getDuration = (row: typeof rowA) => {
            const startedAt = new Date(row.original.started_at).getTime();
            const completedAt = row.original.completed_at
              ? new Date(row.original.completed_at).getTime()
              : null;
            return completedAt ? completedAt - startedAt : Infinity;
          };
          return getDuration(rowA) - getDuration(rowB);
        },
      }),
      columnHelper.accessor('status', {
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="-ml-4"
            >
              Status
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: (info) => <Badge variant={getStatusVariant(info.getValue())}>{info.getValue()}</Badge>,
      }),
      columnHelper.accessor('products_found', {
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="-ml-4"
            >
              Products
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: (info) => <div>{info.getValue() !== null ? info.getValue() : '-'}</div>,
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: (info) => (
          <div className="text-right">
            <Link to="/runs/$runId" params={{ runId: String(info.row.original.id) }}>
              <Button variant="ghost" size="sm">
                View
              </Button>
            </Link>
          </div>
        ),
      })
    );

    return baseColumns;
  }, [jobId, jobs]);

  const table = useReactTable({
    data: runs ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
