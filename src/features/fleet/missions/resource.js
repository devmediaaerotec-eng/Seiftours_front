import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';
import { createResource } from '@/lib/resource';

const BASE = '/admin/fleet/missions';

export const missions = createResource('missions', BASE);

export const useMissionOptions = () =>
  useQuery({ queryKey: ['missions', 'options'], queryFn: () => api(`${BASE}/form-options`), staleTime: 60_000 });

export const useWeek = (start) =>
  useQuery({ queryKey: ['missions', 'week', start], queryFn: () => api(`${BASE}/week?start=${start}`), placeholderData: keepPreviousData });

export const useDay = (date) =>
  useQuery({ queryKey: ['missions', 'day', date], queryFn: () => api(`${BASE}/day?date=${date}`), placeholderData: keepPreviousData });

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
      qc.invalidateQueries({ queryKey: ['buses'] });          // le statut « En mission » du bus peut changer
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