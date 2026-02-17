import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Job } from '@/lib/types';

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data } = await api.get<Job[]>('/api/jobs');
      return data;
    },
  });
}
