import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Reads the admin config (masked secrets + AI providers + storage status). */
export function useAdminConfig() {
  return useQuery({ queryKey: ['admin', 'config'], queryFn: () => api.admin.getConfig() });
}

/** Invalidates system readiness + admin config so the UI reflects new settings. */
export function useAdminRefresh() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: ['system', 'status'] });
    qc.invalidateQueries({ queryKey: ['admin', 'config'] });
  }, [qc]);
}
