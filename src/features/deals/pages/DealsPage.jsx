import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Pencil, Star } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { assetUrl, fmtDate, money } from '@/lib/format';
import { deals, useDealFormOptions, useDuplicateDeal } from '../resource';

export default function DealsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const category = params.get('category') || '';
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);

  const options = useDealFormOptions();
  const { data, isLoading, error } = deals.useList({ category, status, q, page, limit: 20 });
  const flags = deals.useFlags();
  const duplicate = useDuplicateDeal();

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const toggle = (row, key) =>
    flags.mutate({ id: row.id, [key]: !row[key] }, { onError: (e) => toast.error(e.message) });

  const copy = (row) =>
    duplicate.mutate(row.id, {
      onSuccess: (res) => { toast.success('Copie créée (masquée).'); navigate(`/deals/${res.id}`); },
      onError: (e) => toast.error(e.message),
    });

  return (
    <>
      <PageHeader title="Bons plans" action={
        <div className="row-tools">
          <Link className="btn ghost" to="/deals/categories">Gérer les catégories</Link>
          <Link className="btn" to="/deals/new">Nouveau bon plan</Link>
        </div>
      } />

      <div className="filters">
        <form onSubmit={(e) => { e.preventDefault(); update({ q: search.trim(), page: '' }); }}>
          <input placeholder="Rechercher par titre…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn">Rechercher</button>
        </form>
        <select value={category} onChange={(e) => update({ category: e.target.value, page: '' })}>
          <option value="">Toutes les catégories</option>
          {(options.data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
          <option value="">Tous les statuts</option>
          <option value="active">En cours</option>
          <option value="expired">Expirés</option>
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
            { key: 'title', label: 'Offre', render: (r) => (
              <>
                <Link to={`/deals/${r.id}`}>{r.title}</Link><br />
                <small className="muted">{r.category_name} · {r.trip_title || r.hotel_name || '—'}</small>
              </>
            ) },
            { key: 'price', label: 'Prix', render: (r) => (
              <>
                {r.discount_text && <span className="badge warn">{r.discount_text}</span>}
                {r.price_millimes != null && <div>{money(r.price_millimes)}</div>}
                {r.old_price_millimes != null && <div className="price-old">{money(r.old_price_millimes)}</div>}
              </>
            ) },
            { key: 'validity', label: 'Validité', render: (r) => (
              r.valid_from || r.valid_until
                ? <>{r.valid_from ? fmtDate(r.valid_from) : '…'} → {r.valid_until ? fmtDate(r.valid_until) : '…'}</>
                : <span className="muted">Sans limite</span>
            ) },
            { key: 'featured', label: '', render: (r) => (
              <button className="toggle" title="Mettre en avant" onClick={() => toggle(r, 'is_featured')}>
                <Star size={18} className={`star ${r.is_featured ? 'on' : ''}`} />
              </button>
            ) },
            { key: 'active', label: 'Statut', render: (r) => (
              r.expired
                ? <span className="badge bad">Expirée</span>
                : (
                  <button className="toggle" title="Publier / masquer" onClick={() => toggle(r, 'is_active')}>
                    <span className={`badge ${r.is_active ? 'ok' : 'muted'}`}>{r.is_active ? 'En cours' : 'Masquée'}</span>
                  </button>
                )
            ) },
            { key: 'actions', label: '', render: (r) => (
              <div className="table-actions">
                <Link className="btn ghost sm" to={`/deals/${r.id}`}><Pencil size={14} /> Modifier</Link>
                <button className="btn ghost sm" onClick={() => copy(r)} aria-label="Dupliquer"><Copy size={14} /></button>
              </div>
            ) },
          ]}
        />
      </div>

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 20} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />
    </>
  );
}