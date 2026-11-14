import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiBlob } from '@/lib/http';
import { createResource } from '@/lib/resource';

const BASE = '/admin/fleet/missions';

export const missions = createResource('missions', BASE);

export const useMissionOptions = () =>
  useQuery({ queryKey: ['missions', 'options'], queryFn: () => api(`${BASE}/form-options`), staleTime: 60_000 });

export const useWeek = (start) =>
  useQuery({
    queryKey: ['missions', 'week', start],
    queryFn: () => api(`${BASE}/week?start=${start}`),
    placeholderData: keepPreviousData,
  });

export const useDay = (date) =>
  useQuery({
    queryKey: ['missions', 'day', date],
    queryFn: () => api(`${BASE}/day?date=${date}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000, // le contrôle du jour reste à jour
  });

export const useMission = (id) =>
  useQuery({ queryKey: ['missions', 'one', id], queryFn: () => api(`${BASE}/${id}`), enabled: !!id });

export const useAvailability = (startsAt, endsAt, exclude) =>
  useQuery({
    queryKey: ['missions', 'availability', startsAt, endsAt, exclude ?? 0],
    queryFn: () => api(`${BASE}/availability?starts_at=${encodeURIComponent(startsAt)}&ends_at=${encodeURIComponent(endsAt)}&exclude=${exclude ?? 0}`),
    enabled: !!startsAt && !!endsAt && endsAt > startsAt,
    staleTime: 5_000,
  });

export const useWeekProgram = (start, enabled = true) =>
  useQuery({ queryKey: ['missions', 'program', start], queryFn: () => api(`${BASE}/week-program?start=${start}`), enabled, staleTime: 0 });

function useMissionMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missions'] });
      qc.invalidateQueries({ queryKey: ['buses'] }); // le statut « En mission » du bus peut changer
    },
  });
}

export const useMissionStatus = () =>
  useMissionMutation(({ id, status, note }) => api(`${BASE}/${id}/status`, { method: 'PATCH', body: { status, note } }));
export const useMissionControl = () =>
  useMissionMutation(({ id, ...body }) => api(`${BASE}/${id}/control`, { method: 'POST', body }));
export const useBulkComplete = () =>
  useMissionMutation((ids) => api(`${BASE}/bulk-complete`, { method: 'POST', body: { ids } }));

export const useMarkNotified = () =>
  useMissionMutation((ids) => api(`${BASE}/mark-notified`, { method: 'POST', body: { ids } }));

// AJOUT : trace l'envoi d'un message (retard, rappel, avertissement…) dans l'historique
export const useLogNotice = () =>
  useMissionMutation(({ id, ...body }) => api(`${BASE}/${id}/notice`, { method: 'POST', body }));
const getToken = () =>
  localStorage.getItem('token') || localStorage.getItem('access_token') || sessionStorage.getItem('token');


export const useClients = (all = false) =>
  useQuery({ queryKey: ['clients', all], queryFn: () => api(`/admin/fleet/clients${all ? '?all=1' : ''}`), staleTime: 30_000 });

const sortByName = (items) => [...items].sort((a, b) => a.name.localeCompare(b.name));

export const useCreateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/admin/fleet/clients', { method: 'POST', body }),
    onSuccess: (res) => {
      // visible tout de suite dans le sélecteur de la mission
      qc.setQueryData(['clients', false], (old) => ({ items: sortByName([...(old?.items ?? []), res.client]) }));
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};


export const useCreateBatch = () =>
  useMissionMutation((body) => api(`${BASE}/batch`, { method: 'POST', body }));
function useClientMutation(fn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }) });
}
export const useUpdateClient = () =>
  useClientMutation(({ id, ...body }) => api(`/admin/fleet/clients/${id}`, { method: 'PUT', body }));
export const useDeleteClient = () =>
  useClientMutation((id) => api(`/admin/fleet/clients/${id}`, { method: 'DELETE' }));
export const useRestoreClient = () =>
  useClientMutation((id) => api(`/admin/fleet/clients/${id}/restore`, { method: 'POST', body: {} }));
export const useInviteClient = () =>
  useClientMutation(({ id, email }) => api(`/admin/fleet/clients/${id}/invite`, { method: 'POST', body: { email } }));
export const useRevokeInvite = () =>
  useClientMutation((id) => api(`/admin/fleet/clients/${id}/invite`, { method: 'DELETE' }));



 /** Télécharge un PDF généré par le serveur. */
export async function downloadPdf(path, params, filename) {
  const blob = await apiBlob(`${BASE}${path}`, params);
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const useLate = () =>
  useQuery({
    queryKey: ['missions', 'late'],
    queryFn: () => api(`${BASE}/late`),
    refetchInterval: 60_000,
  });