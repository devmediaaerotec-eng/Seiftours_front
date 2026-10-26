import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './http';

const qs = (p = {}) => {
  const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v !== '' && v != null));
  return s.toString() ? `?${s}` : '';
};
export function createResource(name, path) {
  const keys = { all: [name], list: (p) => [name, 'list', p], one: (id) => [name, 'one', id] };

  const useList = (params) =>
    useQuery({ queryKey: keys.list(params), queryFn: () => api(`${path}${qs(params)}`), placeholderData: keepPreviousData });

  const useOne = (id) =>
    useQuery({ queryKey: keys.one(id), queryFn: () => api(`${path}/${id}`), enabled: !!id });

  const useWrite = (fn) => {
    const qc = useQueryClient();
    return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }) });
  };

  const useSave = () =>
    useWrite(({ id, body }) => api(id ? `${path}/${id}` : path, { method: id ? 'PUT' : 'POST', body }));
  const useRemove = () => useWrite((id) => api(`${path}/${id}`, { method: 'DELETE' }));
  const useFlags = () => useWrite(({ id, ...flags }) => api(`${path}/${id}/flags`, { method: 'PATCH', body: flags }));
  const useReorder = () => useWrite((ids) => api(`${path}/reorder`, { method: 'POST', body: { ids } }));

  return { keys, useList, useOne, useSave, useRemove, useFlags, useReorder };
}

 


 



