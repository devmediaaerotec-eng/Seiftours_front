import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';
import { createResource } from '@/lib/resource';

const BASE = '/admin/fleet/transport-requests';

export const transportRequests = createResource('transport-requests', BASE);

export const useTransportStats = () =>
  useQuery({ queryKey: ['transport-requests', 'stats'], queryFn: () => api(`${BASE}/stats`) });

export function useUpdateTransportRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => api(`${BASE}/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transport-requests'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}