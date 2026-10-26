import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';
import { createResource } from '@/lib/resource';

export const deals = createResource('deals', '/admin/deals');
export const dealCategories = createResource('deal-categories', '/admin/deal-categories');

export const useDealFormOptions = () =>
  useQuery({ queryKey: ['deals', 'form-options'], queryFn: () => api('/admin/deals/form-options'), staleTime: 0 });

export function useDuplicateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api(`/admin/deals/${id}/duplicate`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: deals.keys.all }),
  });
}