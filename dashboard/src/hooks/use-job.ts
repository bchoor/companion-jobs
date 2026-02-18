import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Job } from '@/lib/types';

export function useJob(jobId: number) {
  return useQuery({
    queryKey: ['jobs', jobId],
    queryFn: async () => {
      const { data } = await api.get<Job>(`/api/jobs/${jobId}`);
      return data;
    },
    enabled: !!jobId,
  });
}
