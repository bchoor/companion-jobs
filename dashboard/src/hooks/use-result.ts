import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Result } from '@/lib/types';

export function useResult(runId: number) {
  return useQuery({
    queryKey: ['results', 'run', runId],
    queryFn: async () => {
      const { data } = await api.get<Result>(`/api/results/${runId}`);
      return data;
    },
    enabled: !!runId,
  });
}
