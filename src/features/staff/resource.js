import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';
import { createResource } from '@/lib/resource';

export const staff = createResource('staff', '/admin/staff');

export const useStaffStats = () => useQuery({ queryKey: ['staff', 'stats'], queryFn: () => api('/admin/staff/stats') });
export const useStaffOptions = () =>
  useQuery({ queryKey: ['staff', 'options'], queryFn: () => api('/admin/staff/form-options'), staleTime: 60_000 });

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/admin/staff/${id}/reset-password`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export const useRoles = () => useQuery({ queryKey: ['roles'], queryFn: () => api('/admin/roles') });

export function useSaveRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }) => api(`/admin/roles/${id}/permissions`, { method: 'PUT', body: { permissions } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });
}