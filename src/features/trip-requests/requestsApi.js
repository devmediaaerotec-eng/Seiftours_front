// Accès aux demandes (voyages / location de bus) avec VOTRE client `api(path, { method, body })`.
// Aucune autre dépendance que React : pas de react-query.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/http';

const listeners = new Set();                       // une modification recharge toutes les listes affichées
const notify = () => listeners.forEach((fn) => fn());

const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

function useLoad(path, { poll = 60_000 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const load = useCallback(() => {
    const n = ++seq.current;                       // ignore les réponses périmées (filtre changé entre-temps)
    return api(path)
      .then((d) => { if (n === seq.current) { setData(d); setError(null); } })
      .catch((e) => { if (n === seq.current) setError(e); })
      .finally(() => { if (n === seq.current) setLoading(false); });
  }, [path]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => {
    listeners.add(load);
    const t = poll ? setInterval(load, poll) : null;      // nouvelles demandes sans recharger la page
    return () => { listeners.delete(load); if (t) clearInterval(t); };
  }, [load, poll]);

  return { data, loading, error, reload: load };
}

/** base : '/admin/trip-requests' ou '/admin/transport-requests' (sans /api : votre client l'ajoute) */
export function createRequestsApi(base) {
  return {
    useList: (params = {}) => useLoad(`${base}${qs(params)}`),
    useCounts: () => useLoad(`${base}/counts`),
    useUpdate() {
      const [pending, setPending] = useState(false);
      const [error, setError] = useState(null);
      const mutate = useCallback(async (id, body) => {
        setPending(true); setError(null);
        try { const r = await api(`${base}/${id}`, { method: 'PATCH', body }); notify(); return r; }
        catch (e) { setError(e); }
        finally { setPending(false); }
      }, []);
      return { mutate, pending, error };
    },
  };
}
