import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/http';

export const useLive = (auto = true) =>
  useQuery({
    queryKey: ['fleet', 'live'],
    queryFn: () => api('/admin/fleet/live'),
    refetchInterval: auto ? 10_000 : false,   // la synchro Unidevpro tourne toutes les 20 s
    refetchIntervalInBackground: false,
  });

export const useTrack = (busId, hours) =>
  useQuery({
    queryKey: ['fleet', 'track', busId, hours],
    queryFn: () => api(`/admin/fleet/live/${busId}/track?hours=${hours}`),
    enabled: !!busId && hours > 0,
    staleTime: 10_000,
  });

/** Distance, vitesses et durées du jour pour toute la flotte */
export const useDayStats = () =>
  useQuery({
    queryKey: ['fleet', 'stats'],
    queryFn: () => api('/admin/fleet/live/stats'),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

/** Détail d'un bus : aujourd'hui + depuis le début de la mission en cours */
export const useBusStats = (busId) =>
  useQuery({
    queryKey: ['fleet', 'stats', busId],
    queryFn: () => api(`/admin/fleet/live/${busId}/stats`),
    enabled: !!busId,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });