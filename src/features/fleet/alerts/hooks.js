import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';
import { createResource } from '@/lib/resource';

const BASE = '/admin/fleet/alerts';

export const alerts = createResource('alerts', BASE);

export const useOpenAlertsCount = (enabled = true) =>
  useQuery({
    queryKey: ['alerts', 'count'],
    queryFn: () => api(`${BASE}/count`),
    enabled,
    retry: false,
    refetchInterval: (q) => (q.state.status === 'error' ? false : 15_000),
  });

function useAlertMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export const useAlertAction = () =>
  useAlertMutation(({ id, action, note }) => api(`${BASE}/${id}`, { method: 'PATCH', body: { action, note } }));
export const useCreateAlert = () => useAlertMutation((body) => api(BASE, { method: 'POST', body }));
export const useRunChecks = () => useAlertMutation(() => api(`${BASE}/run`, { method: 'POST' }));