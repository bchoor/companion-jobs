import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Run } from '@/lib/types';

export function useRun(runId: number) {
  return useQuery({
    queryKey: ['runs', runId],
    queryFn: async () => {
      const { data } = await api.get<Run>(`/api/runs/${runId}`);
      return data;
    },
    enabled: !!runId,
  });
}
