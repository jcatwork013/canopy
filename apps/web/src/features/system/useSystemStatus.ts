import type { SystemStatus } from '@canopy/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Polls /system/status. Short staleness so the app reacts after admin setup. */
export function useSystemStatus() {
  return useQuery<SystemStatus>({
    queryKey: ['system', 'status'],
    queryFn: () => api.system.status(),
    staleTime: 15_000,
    refetchInterval: (q) => (q.state.data?.ready ? false : 10_000),
    retry: 1,
  });
}
