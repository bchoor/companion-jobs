import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Run } from '@/lib/types';

export function useRuns(jobId?: number) {
  return useQuery({
    queryKey: jobId ? ['runs', 'job', jobId] : ['runs'],
    queryFn: async () => {
      const url = jobId ? `/api/runs?job_id=${jobId}` : '/api/runs';
      const { data } = await api.get<Run[]>(url);
      return data;
    },
  });
}
