import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Pencil, Star } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { assetUrl, fmtDate, money } from '@/lib/format';
import { trips, useDuplicateTrip, useTripFlags } from '../resource';

const SCOPES = {
  packages: { title: 'Voyages organisés', base: '/trips',    newLabel: 'Nouveau voyage',  query: (type) => ({ types: type || 'omra,organized' }) },
  circuits: { title: 'Circuits',          base: '/circuits', newLabel: 'Nouveau circuit', query: () => ({ type: 'circuit' }) },
};
const TYPES = { omra: 'Omra', organized: 'Voyage organisé', circuit: 'Circuit' };

export default function TripsPage({ scope = 'packages' }) {
  const cfg = SCOPES[scope];
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const type = params.get('type') || '';
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);

  const { data, isLoading, error } = trips.useList({ ...cfg.query(type), status, q, page, limit: 20 });
  const flags = useTripFlags();
  const duplicate = useDuplicateTrip();

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const toggle = (row, key) =>
    flags.mutate({ id: row.id, [key]: !row[key] }, { onError: (e) => toast.error(e.message) });

  const copy = (row) =>
    duplicate.mutate(row.id, {
      onSuccess: (res) => { toast.success('Copie créée (masquée).'); navigate(`${cfg.base}/${res.id}`); },
      onError: (e) => toast.error(e.message),
    });

  return (
    <>
<PageHeader title={cfg.title} action={
  <div className="row-tools">
    {scope === 'circuits' && <Link className="btn ghost" to="/regions">Gérer les régions</Link>}
    <Link className="btn" to={`${cfg.base}/new`}>{cfg.newLabel}</Link>
  </div>
} />
      <div className="filters">
        <form onSubmit={(e) => { e.preventDefault(); update({ q: search.trim(), page: '' }); }}>
          <input placeholder="Rechercher par titre ou slug…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn">Rechercher</button>
        </form>
        {scope === 'packages' && (
          <select value={type} onChange={(e) => update({ type: e.target.value, page: '' })}>
            <option value="">Omra et voyages organisés</option>
            <option value="omra">Omra</option>
            <option value="organized">Voyages organisés</option>
          </select>
        )}
        <select value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
          <option value="">Tous les statuts</option>
          <option value="active">Publiés</option>
          <option value="hidden">Masqués</option>
        </select>
      </div>

      {error && <div className="alert bad">{error.message}</div>}

      <div className="card">
        <DataTable
          loading={isLoading}
          rows={data?.items}
          columns={[
                        { key: 'img', label: '', render: (r) => (r.image_url ? <img className="thumb" src={assetUrl(r.image_url)} alt="" /> : <div className="thumb" />) },  

            { key: 'title', label: 'Titre', render: (r) => (
              <>
                <Link to={`${cfg.base}/${r.id}`}>{r.title}</Link><br />
                <small className="muted">{r.destination_name || r.region_name || '—'}{scope === 'packages' ? ` · ${TYPES[r.type]}` : ''}</small>
              </>
            ) },
            { key: 'nights', label: 'Durée', render: (r) => `${r.duration_nights} nuits` },
            { key: 'price', label: 'À partir de', render: (r) => (r.price_from_millimes != null ? money(r.price_from_millimes) : '—') },
            { key: 'next', label: 'Prochain départ', render: (r) => (
              <>{fmtDate(r.next_departure)}<br /><small className="muted">{r.upcoming_departures} à venir</small></>
            ) },
            { key: 'featured', label: '', render: (r) => (
              <button className="toggle" title="Mettre en avant" onClick={() => toggle(r, 'is_featured')}>
                <Star size={18} className={`star ${r.is_featured ? 'on' : ''}`} />
              </button>
            ) },
            { key: 'active', label: 'Statut', render: (r) => (
              <button className="toggle" title="Publier / masquer" onClick={() => toggle(r, 'is_active')}>
                <span className={`badge ${r.is_active ? 'ok' : 'muted'}`}>{r.is_active ? 'Publié' : 'Masqué'}</span>
              </button>
            ) },
            { key: 'actions', label: '', render: (r) => (
              <div className="table-actions">
                <Link className="btn ghost sm" to={`${cfg.base}/${r.id}`}><Pencil size={14} /> Modifier</Link>
                <button className="btn ghost sm" onClick={() => copy(r)}><Copy size={14} /></button>
              </div>
            ) },
          ]}
        />
      </div>

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 20} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />
    </>
  );
}