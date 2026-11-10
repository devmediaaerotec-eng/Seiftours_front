// Accès API avec VOTRE client `api(path, { method, body })` (le préfixe /api est ajouté par le client).
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/http';

const BASE = '/admin/contact-messages';
const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

const listeners = new Set();                       // une modification recharge la liste et les compteurs
const notify = () => listeners.forEach((fn) => fn());

function useLoad(path, poll = 60_000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seq = useRef(0);
  const load = useCallback(() => {
    const n = ++seq.current;                       // ignore une réponse périmée si le filtre a changé entre-temps
    return api(path)
      .then((d) => { if (n === seq.current) { setData(d); setError(null); } })
      .catch((e) => { if (n === seq.current) setError(e); })
      .finally(() => { if (n === seq.current) setLoading(false); });
  }, [path]);
  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => {
    listeners.add(load);
    const t = setInterval(load, poll);              // nouveaux messages sans recharger la page
    return () => { listeners.delete(load); clearInterval(t); };
  }, [load, poll]);
  return { data, loading, error, reload: load };
}

export const useMessages = (params) => useLoad(`${BASE}${qs(params)}`);
export const useCounts = () => useLoad(`${BASE}/counts`);

export async function updateMessage(id, body) {
  const r = await api(`${BASE}/${id}`, { method: 'PATCH', body });
  notify();
  return r;
}
export async function removeMessage(id) {
  const r = await api(`${BASE}/${id}`, { method: 'DELETE' });
  notify();
  return r;
}
