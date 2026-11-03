import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import { money } from '@/lib/format';
import { tripRequests } from '../resource';
import '../trip-requests.css';

const LIMIT = 20;
const STATUS = { new: 'Nouvelle', contacted: 'Contactée', confirmed: 'Confirmée', cancelled: 'Annulée' };
const BADGE = { new: 'warn', contacted: 'muted', confirmed: 'ok', cancelled: 'bad' };
const TYPE = { omra: 'Omra', organized: 'Voyage organisé', circuit: 'Circuit' };
const fmt = (d) => (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const day = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR') : '—');

function Detail({ row, onClose }) {
  const update = tripRequests.useUpdate();
  const [notes, setNotes] = useState(row.admin_notes ?? '');
  const [quote, setQuote] = useState(row.quoted_total_millimes ? String(row.quoted_total_millimes / 1000) : '');
  useEffect(() => { setNotes(row.admin_notes ?? ''); setQuote(row.quoted_total_millimes ? String(row.quoted_total_millimes / 1000) : ''); }, [row.id]);

  const save = (extra = {}) => update.mutate(row.id, {
    admin_notes: notes, quoted_total_millimes: quote === '' ? null : Math.round(Number(quote) * 1000), ...extra,
  });

  return (
    <div className="card tf-card" style={{ marginBottom: '1rem' }}>
      <div className="tf-row-head">
        <h3 style={{ margin: 0 }}>{row.reference} · {row.trip_title}</h3>
        <button className="btn ghost sm" onClick={onClose}>Fermer</button>
      </div>
      {update.error && <div className="alert bad">{update.error.message}</div>}
      <div className="tf-grid" style={{ marginTop: '.75rem' }}>
        <div><strong>{row.client_name}</strong><br />
          <a href={`tel:${row.client_phone}`}>{row.client_phone}</a>
          {row.client_email && <><br /><a href={`mailto:${row.client_email}`}>{row.client_email}</a></>}</div>
        <div>{TYPE[row.trip_type]} · {row.adults} adulte(s){Number(row.children) ? ` + ${row.children} enfant(s)` : ''}<br />
          Départ souhaité : {day(row.departure_date ?? row.preferred_date)}{!row.departure_id && row.preferred_date ? ' (date libre)' : ''}<br />
          Reçue le {fmt(row.created_at)}</div>
        {row.message && <div className="span2"><span className="tf-label">Message du client</span><p style={{ whiteSpace: 'pre-wrap', margin: '.25rem 0 0' }}>{row.message}</p></div>}
        <label className="tf-field"><span className="tf-label">Devis envoyé (TND)</span>
          <input type="number" min="0" step="0.001" value={quote} onChange={(e) => setQuote(e.target.value)} /></label>
        <label className="tf-field"><span className="tf-label">Statut</span>
          <select value={row.status} disabled={update.pending} onChange={(e) => save({ status: e.target.value })}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="tf-field span2"><span className="tf-label">Notes internes</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </div>
      <div className="tf-actions">
        <button className="btn" disabled={update.pending} onClick={() => save()}>Enregistrer</button>
        {row.handled_by_name && <span className="tf-hint">Dernier traitement : {row.handled_by_name}, {fmt(row.handled_at)}</span>}
      </div>
    </div>
  );
}

export default function TripRequestsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const type = params.get('type') || '';
  const page = Number(params.get('page')) || 1;
  const [q, setQ] = useState(params.get('q') || '');
  const [dq, setDq] = useState(q);
  const [openId, setOpenId] = useState(null);

  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  const setParam = (k, v) => {
    const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setParams(n, { replace: true });
  };

  const { data, loading: isLoading, error } = tripRequests.useList({ status, type, q: dq, page, limit: LIMIT });
  const counts = tripRequests.useCounts().data;
  const rows = data?.items ?? [];
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / LIMIT));
  const open = rows.find((r) => r.id === openId);

  return (
    <>
      <PageHeader title={`Réservations${counts?.new ? ` · ${counts.new} nouvelle(s)` : ''}`} />
      <div className="filters">
        <input type="search" placeholder="Nom, téléphone, référence, voyage…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}{counts ? ` (${counts[k]})` : ''}</option>)}
        </select>
        <select value={type} onChange={(e) => setParam('type', e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {error && <div className="alert bad">{error.message}</div>}
      {open && <Detail row={open} onClose={() => setOpenId(null)} />}
      <div className="card">
        <DataTable loading={isLoading} rows={rows} columns={[
          { key: 'ref', label: 'Référence', render: (r) => <button className="btn ghost sm" onClick={() => setOpenId(r.id)}>{r.reference}</button> },
          { key: 'date', label: 'Reçue le', render: (r) => fmt(r.created_at) },
          { key: 'client', label: 'Client', render: (r) => <>{r.client_name}<br /><span className="tf-hint">{r.client_phone}</span></> },
          { key: 'trip', label: 'Voyage', render: (r) => <>{r.trip_title}<br /><span className="tf-hint">{TYPE[r.trip_type]}</span></> },
          { key: 'dep', label: 'Départ', render: (r) => day(r.departure_date ?? r.preferred_date) },
          { key: 'pax', label: 'Voyageurs', render: (r) => `${r.adults}${Number(r.children) ? ` + ${r.children}` : ''}` },
          { key: 'quote', label: 'Devis', render: (r) => (r.quoted_total_millimes ? money(r.quoted_total_millimes) : '—') },
          { key: 'status', label: 'Statut', render: (r) => <span className={`badge ${BADGE[r.status]}`}>{STATUS[r.status]}</span> },
        ]} />
        {!isLoading && rows.length === 0 && <div className="tf-empty">Aucune réservation.</div>}
        {pages > 1 && (
          <div className="tf-actions">
            <button className="btn ghost sm" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>← Précédent</button>
            <span className="tf-hint">Page {page} / {pages} · {data.total} demandes</span>
            <button className="btn ghost sm" disabled={page >= pages} onClick={() => setParam('page', String(page + 1))}>Suivant →</button>
          </div>
        )}
      </div>
    </>
  );
}
