import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';
import { createResource } from '@/lib/resource';

export const branches = createResource('branches', '/admin/branches');

export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => api('/admin/settings') });

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values) => api('/admin/settings', { method: 'PUT', body: { values } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export const useHotelMarkup = () => useQuery({ queryKey: ['hotel-markup'], queryFn: () => api('/admin/hotel-markup') });

export function useSaveHotelMarkup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (percent) => api('/admin/hotel-markup', { method: 'PUT', body: { percent } }),
    onSuccess: (data) => qc.setQueryData(['hotel-markup'], data),
  });
}