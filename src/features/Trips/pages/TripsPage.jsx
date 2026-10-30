import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarDays, Clock, Compass, Copy, Eye, EyeOff, ImageOff, LayoutGrid, List, MapPin, Moon, Pencil, Plane, Plus,
  Route, Star, TriangleAlert,
} from 'lucide-react';
import ActionMenu from '@/components/ui/ActionMenu';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import { FilterBar, SearchBox } from '@/components/ui/Filters';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Segmented from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { errText } from '@/lib/errors';
import { assetUrl, fmtDate, money } from '@/lib/format';
import { trips, useDuplicateTrip, useTripFlags } from '../resource';

const SCOPES = {
  packages: {
    title: 'Voyages organisés', base: '/trips', newLabel: 'Nouveau voyage', icon: Plane,
    description: 'Omra et voyages organisés proposés sur le site, avec leurs départs et leurs tarifs.',
    query: (type) => ({ types: type || 'omra,organized' }),
  },
  circuits: {
    title: 'Circuits', base: '/circuits', newLabel: 'Nouveau circuit', icon: Route,
    description: 'Circuits en Tunisie par région : programme jour par jour, départs et tarifs.',
    query: () => ({ type: 'circuit' }),
  },
};

const TYPE = {
  omra: { label: 'Omra', cls: 'gold', icon: Moon },
  organized: { label: 'Voyage organisé', cls: 'teal', icon: Plane },
  circuit: { label: 'Circuit', cls: 'info', icon: Route },
};

function TripCard({ r, base, menu, onFeature }) {
  const t = TYPE[r.type] ?? TYPE.organized;
  const TypeIcon = t.icon;
  const place = r.destination_name || r.region_name;

  return (
    <article className={cn('flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70 transition hover:shadow-md', !r.is_active && 'bg-slate-50/60')}>
      <div className="relative aspect-[16/10] bg-slate-100">
        <Link to={`${base}/${r.id}`} className="block size-full" aria-label={r.title}>
          {r.image_url ? (
            <img src={assetUrl(r.image_url)} alt="" loading="lazy" className={cn('size-full object-cover', !r.is_active && 'grayscale')} />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1 bg-linear-to-br from-brand-50 to-brand-100 text-brand-300">
              <ImageOff className="size-9" strokeWidth={1.5} />
              <span className="text-xs font-medium">Sans photo</span>
            </div>
          )}
        </Link>
        <Badge tone={t.cls} className="absolute left-3 top-3 bg-white/95 shadow-xs"><TypeIcon className="size-3" />{t.label}</Badge>
        <button type="button" onClick={onFeature} aria-pressed={r.is_featured} aria-label={r.is_featured ? 'Retirer de la une' : 'Mettre en avant'}
                className="absolute right-3 top-3 rounded-full bg-white/95 p-2 shadow-xs transition hover:scale-105">
          <Star className={cn('size-[18px]', r.is_featured ? 'fill-gold-500 text-gold-500' : 'text-slate-400')} />
        </button>
        <Badge tone={r.is_active ? 'ok' : 'muted'} dot className="absolute bottom-3 left-3 bg-white/95 shadow-xs">
          {r.is_active ? 'Publié' : 'Masqué'}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`${base}/${r.id}`} className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 hover:text-brand-700">{r.title}</Link>
            {place && <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="size-3.5 shrink-0" />{place}</p>}
          </div>
          {menu}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-slate-400" />{r.duration_nights} nuits</span>
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-slate-400" />
            {r.next_departure ? `Prochain : ${fmtDate(r.next_departure)}` : 'Aucun départ daté'}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
          <div>
            <p className="text-xs text-slate-500">À partir de</p>
            <p className="text-lg font-semibold tracking-tight text-slate-900">{r.price_from_millimes != null ? money(r.price_from_millimes) : 'Sur devis'}</p>
          </div>
          {r.upcoming_departures > 0
            ? <Badge tone="ok">{r.upcoming_departures} départ{r.upcoming_departures > 1 ? 's' : ''} à venir</Badge>
            : <Badge tone="warn"><TriangleAlert className="size-3" />Sans départ à venir</Badge>}
        </div>
      </div>
    </article>
  );
}

export default function TripsPage({ scope = 'packages' }) {
  const cfg = SCOPES[scope];
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const type = params.get('type') || '';
  const status = params.get('status') || '';
  const view = params.get('view') === 'table' ? 'table' : 'cards';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);

  const { data, isLoading, error } = trips.useList({ ...cfg.query(type), status, q, page, limit: 12 });
  const flags = useTripFlags();
  const duplicate = useDuplicateTrip();
  const items = data?.items ?? [];

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const toggle = (row, key, message) =>
    flags.mutate({ id: row.id, [key]: !row[key] }, { onSuccess: () => toast.success(message), onError: (e) => toast.error(errText(e)) });

  const copy = (row) =>
    duplicate.mutate(row.id, {
      onSuccess: (res) => { toast.success('Copie créée (masquée). Modifiez-la puis publiez-la.'); navigate(`${cfg.base}/${res.id}`); },
      onError: (e) => toast.error(errText(e)),
    });

  const menuItems = (r) => [
    { label: 'Modifier', icon: Pencil, onClick: () => navigate(`${cfg.base}/${r.id}`) },
    { label: 'Dupliquer', icon: Copy, onClick: () => copy(r) },
    { divider: true },
    { label: r.is_featured ? 'Retirer de la une' : 'Mettre en avant', icon: Star,
      onClick: () => toggle(r, 'is_featured', r.is_featured ? 'Retiré de la une.' : 'Mis en avant.') },
    { label: r.is_active ? 'Masquer du site' : 'Publier sur le site', icon: r.is_active ? EyeOff : Eye,
      onClick: () => toggle(r, 'is_active', r.is_active ? 'Voyage masqué.' : 'Voyage publié.') },
  ];
  const menu = (r) => <ActionMenu items={menuItems(r)} label={r.title} />;

  const columns = [
    { key: 'trip', label: 'Voyage', render: (r) => {
      const t = TYPE[r.type] ?? TYPE.organized;
      return (
        <div className="flex items-center gap-3">
          {r.image_url
            ? <img src={assetUrl(r.image_url)} alt="" className="h-12 w-[72px] rounded-md object-cover" />
            : <span className="flex h-12 w-[72px] items-center justify-center rounded-md bg-slate-100 text-slate-400"><ImageOff className="size-5" /></span>}
          <div className="min-w-0">
            <Link to={`${cfg.base}/${r.id}`} className="block font-semibold text-slate-900 hover:text-brand-700">{r.title}</Link>
            <span className="text-xs text-slate-500">{r.destination_name || r.region_name || '—'}</span>
          </div>
          <Badge tone={t.cls}><t.icon className="size-3" />{t.label}</Badge>
        </div>
      );
    } },
    { key: 'nights', label: 'Durée', render: (r) => <span className="whitespace-nowrap">{r.duration_nights} nuits</span> },
    { key: 'price', label: 'À partir de', render: (r) => <span className="whitespace-nowrap font-medium">{r.price_from_millimes != null ? money(r.price_from_millimes) : '—'}</span> },
    { key: 'next', label: 'Prochain départ', render: (r) => (
      <>
        <span className="whitespace-nowrap">{fmtDate(r.next_departure)}</span>
        <span className={cn('block text-xs', r.upcoming_departures ? 'text-slate-500' : 'text-amber-600')}>{r.upcoming_departures} à venir</span>
      </>
    ) },
    { key: 'featured', label: '', render: (r) => (
      <button type="button" onClick={() => toggle(r, 'is_featured', r.is_featured ? 'Retiré de la une.' : 'Mis en avant.')}
              aria-label="Mettre en avant" className="rounded-lg p-1.5 hover:bg-slate-100">
        <Star className={cn('size-[18px]', r.is_featured ? 'fill-gold-500 text-gold-500' : 'text-slate-300')} />
      </button>
    ) },
    { key: 'status', label: 'Statut', render: (r) => (
      <button type="button" title="Publier / masquer" onClick={() => toggle(r, 'is_active', r.is_active ? 'Voyage masqué.' : 'Voyage publié.')}>
        <Badge tone={r.is_active ? 'ok' : 'muted'} dot>{r.is_active ? 'Publié' : 'Masqué'}</Badge>
      </button>
    ) },
    { key: 'actions', label: '', className: 'w-12 text-right', render: (r) => menu(r) },
  ];

  const cardsGrid = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {isLoading && items.length === 0 && Array.from({ length: 6 }, (_, i) => <div key={i} className="h-80 animate-pulse rounded-xl bg-slate-200/60" />)}
      {items.map((r) => (
        <TripCard key={r.id} r={r} base={cfg.base} menu={menu(r)} onFeature={() => toggle(r, 'is_featured', r.is_featured ? 'Retiré de la une.' : 'Mis en avant.')} />
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        title={cfg.title}
        description={cfg.description}
        action={(
          <>
            {scope === 'circuits' && <Button as={Link} to="/regions" variant="secondary" icon={Compass}>Gérer les régions</Button>}
            <Button as={Link} to={`${cfg.base}/new`} icon={Plus}>{cfg.newLabel}</Button>
          </>
        )}
      />

      <FilterBar>
        <SearchBox value={search} onChange={setSearch} onSubmit={() => update({ q: search.trim(), page: '' })} placeholder="Titre ou adresse web…" />
        {scope === 'packages' && (
          <Segmented value={type} onChange={(v) => update({ type: v, page: '' })}
                     options={[['', 'Tous'], ['omra', 'Omra'], ['organized', 'Organisés']]} />
        )}
        <Segmented value={status} onChange={(v) => update({ status: v, page: '' })}
                   options={[['', 'Tous statuts'], ['active', 'Publiés'], ['hidden', 'Masqués']]} />
        <div className="ml-auto hidden md:block">
          <Segmented value={view} onChange={(v) => update({ view: v === 'table' ? 'table' : '' })}
                     options={[['cards', <LayoutGrid key="g" className="size-4" aria-label="Cartes" />], ['table', <List key="l" className="size-4" aria-label="Tableau" />]]} />
        </div>
      </FilterBar>

      {error && <Alert tone="bad">{error.message}</Alert>}

      {!isLoading && items.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon={cfg.icon} title="Aucun résultat"
                      text={q || status || type ? 'Modifiez vos filtres ou votre recherche.' : `Créez votre premier ${scope === 'circuits' ? 'circuit' : 'voyage'}.`}
                      action={<Button as={Link} to={`${cfg.base}/new`} icon={Plus}>{cfg.newLabel}</Button>} />
        </Card>
      ) : view === 'table' ? (
        <>
          <Card padded={false} className="hidden overflow-hidden md:block"><DataTable loading={isLoading} rows={items} columns={columns} /></Card>
          <div className="md:hidden">{cardsGrid}</div>
        </>
      ) : cardsGrid}

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 12} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />
    </>
  );
}