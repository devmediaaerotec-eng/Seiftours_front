import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';
import { createResource } from '@/lib/resource';

export const trips = createResource('trips', '/admin/trips');

export const useTripFormOptions = () =>
  useQuery({
    queryKey: ['trips', 'form-options'],
    queryFn: () => api('/admin/trips/form-options'),
    staleTime: 5 * 60_000,
  });

export function useTripFlags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...flags }) => api(`/admin/trips/${id}/flags`, { method: 'PATCH', body: flags }),
    onSuccess: () => qc.invalidateQueries({ queryKey: trips.keys.all }),
  });
}

export function useDuplicateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/admin/trips/${id}/duplicate`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: trips.keys.all }),
  });
}