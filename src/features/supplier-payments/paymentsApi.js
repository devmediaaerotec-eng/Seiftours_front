// Accès API avec VOTRE client `api(path, { method, body })` (le préfixe /api est ajouté par le client).
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken } from '@/lib/http';

const BASE = '/admin/supplier-payments';
const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export function usePayments(params) {
  const key = qs(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seq = useRef(0);
  const load = useCallback(() => {
    const n = ++seq.current;                       // ignore une réponse périmée si le filtre a changé entre-temps
    return api(`${BASE}${key}`)
      .then((d) => { if (n === seq.current) { setData(d); setError(null); } })
      .catch((e) => { if (n === seq.current) setError(e); })
      .finally(() => { if (n === seq.current) setLoading(false); });
  }, [key]);
  useEffect(() => { setLoading(true); load(); }, [load]);
  return { data, loading, error, reload: load };
}

export function useMeta(version) {
  const [meta, setMeta] = useState({ suppliers: [], years: [], banks: [] });
  useEffect(() => { api(`${BASE}/meta`).then(setMeta).catch(() => {}); }, [version]);
  return meta;
}

export const savePayment = (id, body) => (id ? api(`${BASE}/${id}`, { method: 'PUT', body }) : api(BASE, { method: 'POST', body }));
export const deletePayment = (id) => api(`${BASE}/${id}`, { method: 'DELETE' });

/** Télécharge le CSV avec le jeton (un lien <a> simple n'enverrait pas l'en-tête Authorization) */
export async function downloadCsv(params) {
  const res = await fetch(`/api${BASE}/export${qs(params)}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error(`Export impossible (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: `reglements-fournisseurs${params.year ? '-' + params.year : ''}.csv` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
