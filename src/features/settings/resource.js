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