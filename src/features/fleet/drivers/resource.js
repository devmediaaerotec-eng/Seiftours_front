import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';
import { createResource } from '@/lib/resource';

export const drivers = createResource('drivers', '/admin/fleet/drivers');

export const useDriverStats = () =>
  useQuery({ queryKey: ['drivers', 'stats'], queryFn: () => api('/admin/fleet/drivers/stats') });

export function useDriverStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api(`/admin/fleet/drivers/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: drivers.keys.all }),
  });
}

export function useResetPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/admin/fleet/drivers/${id}/reset-pin`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: drivers.keys.all }),
  });
}

export const useDriverFormOptions = () =>
  useQuery({
    queryKey: ['drivers', 'form-options'],
    queryFn: () => api('/admin/fleet/drivers/form-options'),
    staleTime: 0,
  });