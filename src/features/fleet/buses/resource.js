import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';
import { createResource } from '@/lib/resource';

export const buses = createResource('buses', '/admin/fleet/buses');

export const useBusStats = () =>
  useQuery({ queryKey: ['buses', 'stats'], queryFn: () => api('/admin/fleet/buses/stats') });

export function useBusStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api(`/admin/fleet/buses/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: buses.keys.all }),
  });
}