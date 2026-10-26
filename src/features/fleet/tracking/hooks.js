import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/http';

export const useLive = (auto = true) =>
  useQuery({
    queryKey: ['fleet', 'live'],
    queryFn: () => api('/admin/fleet/live'),
    refetchInterval: auto ? 5_000 : false,
    refetchIntervalInBackground: false,
  });

export const useTrack = (busId, hours) =>
  useQuery({
    queryKey: ['fleet', 'track', busId, hours],
    queryFn: () => api(`/admin/fleet/live/${busId}/track?hours=${hours}`),
    enabled: !!busId && hours > 0,
    staleTime: 10_000,
  });