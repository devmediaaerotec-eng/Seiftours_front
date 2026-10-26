import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/http';
import { STATUS, fmtDate, money } from '@/lib/format';

export default function Bookings() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);

  const [search, setSearch] = useState(q);
  const [data, setData] = useState({ items: [], total: 0, limit: 20 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page, limit: 20 });
    if (status) qs.set('status', status);
    if (q) qs.set('q', q);
    api(`/admin/bookings?${qs}`)
      .then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status, q, page]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const pages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <>
      <h2>Réservations</h2>

      <div className="filters">
        <form onSubmit={(e) => { e.preventDefault(); update({ q: search.trim(), page: '' }); }}>
          <input placeholder="Référence, nom, e-mail, téléphone…" value={search}
                 onChange={(e) => setSearch(e.target.value)} />
          <button className="btn">Rechercher</button>
        </form>
        <select value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {error && <div className="alert bad">{error}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Référence</th><th>Client</th><th>Hôtel</th><th>Séjour</th>
              <th>Total</th><th>Payé</th><th>Agence</th><th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((b) => (
              <tr key={b.id}>
                <td><Link to={`/bookings/${b.reference}`}>{b.reference}</Link></td>
                <td>{b.customer_name}<br /><small className="muted">{b.phone}</small></td>
                <td>{b.hotel_name}</td>
                <td>{fmtDate(b.check_in)} → {fmtDate(b.check_out)}<br /><small className="muted">{b.nights} nuits</small></td>
                <td>{money(b.total_millimes)}</td>
                <td>{money(b.paid_millimes)}</td>
                <td>{b.branch_name || '—'}</td>
                <td><span className={`badge ${STATUS[b.status]?.cls}`}>{STATUS[b.status]?.label || b.status}</span></td>
              </tr>
            ))}
            {!loading && data.items.length === 0 && <tr><td colSpan="8" className="muted">Aucun résultat.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pager">
        <button className="btn ghost" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>← Précédent</button>
        <span>Page {page} / {pages} · {data.total} réservation(s)</span>
        <button className="btn ghost" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>Suivant →</button>
      </div>
    </>
  );
}