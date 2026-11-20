import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';
import { createResource } from '@/lib/resource';

const BASE = '/admin/flight-requests';

export const flightRequests = createResource('flight-requests', BASE);

export const useFlightStats = () =>
  useQuery({ queryKey: ['flight-requests', 'stats'], queryFn: () => api(`${BASE}/stats`) });

export function useUpdateFlightRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => api(`${BASE}/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flight-requests'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
