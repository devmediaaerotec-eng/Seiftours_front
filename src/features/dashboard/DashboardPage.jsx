import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, Banknote, BellRing, Bus, CalendarCheck, CheckCircle2, ClipboardCheck, ClipboardList, History,
  Inbox, MessageSquare, Plane, Plus, RefreshCw, Route, Tag, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import BarChart from '@/components/ui/BarChart';
import Button from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import Segmented from '@/components/ui/Segmented';
import { useAuth } from '@/features/auth/AuthProvider';
import { MISSION_STATUS } from '@/features/fleet';
import { cn } from '@/lib/cn';
import { api } from '@/lib/http';
import { STATUS, agoFromMs, fmtDate, fmtDayLong, fmtDayShort, hmOf, money, nowLocal, timeAgo, todayYmd } from '@/lib/format';

const ENTITY = {
  trip: 'Voyage', deal: 'Bon plan', deal_category: 'Catégorie', destination: 'Destination', region: 'Région',
  bus: 'Bus', driver: 'Chauffeur', staff: 'Compte', branch: 'Agence', role: 'Rôle', settings: 'Réglages',
};
const VERB = {
  create: 'créé', update: 'modifié', delete: 'supprimé', flags: 'visibilité modifiée', duplicate: 'dupliqué',
  reorder: 'réordonné', status: 'statut modifié', archive: 'archivé', restore: 'restauré', pin_reset: 'PIN régénéré',
  activate: 'réactivé', deactivate: 'désactivé', password_reset: 'mot de passe réinitialisé', permissions: 'droits modifiés',
};
const activityText = (a) => `${ENTITY[a.entity_type] ?? a.entity_type} ${VERB[a.action.split('.')[1]] ?? a.action.split('.')[1]}`;

const SEV_TONE = { critical: 'bad', warning: 'warn', info: 'info' };
const DOT = { bad: 'bg-red-500', warn: 'bg-amber-500', info: 'bg-sky-500' };
const ICON_TONE = {
  brand: 'bg-brand-50 text-brand-600', gold: 'bg-gold-50 text-gold-600', ok: 'bg-emerald-50 text-emerald-600',
  warn: 'bg-amber-50 text-amber-600', bad: 'bg-red-50 text-red-600',
};

const QUICK = [
  { label: 'Nouvelle mission', to: '/fleet/missions', perm: 'missions.manage', icon: Plus },
  { label: 'Contrôle du jour', to: '/fleet/missions/control', perm: 'missions.control', icon: ClipboardCheck },
  { label: 'Nouveau voyage', to: '/trips/new', perm: 'trips.manage', icon: Plane },
  { label: 'Nouveau circuit', to: '/circuits/new', perm: 'trips.manage', icon: Route },
  { label: 'Nouveau bon plan', to: '/deals/new', perm: 'deals.manage', icon: Tag },
  { label: 'Réservations', to: '/bookings', perm: 'bookings.read', icon: CalendarCheck },
];

function Delta({ pct }) {
  if (pct == null) return null;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold', up ? 'text-emerald-600' : 'text-red-600')}>
      <Icon className="size-3.5" /> {up ? '+' : ''}{pct.toLocaleString('fr-FR')} %
    </span>
  );
}

function Kpi({ icon: Icon, label, value, sub, delta, to, tone = 'brand' }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', ICON_TONE[tone])}><Icon className="size-[18px]" /></span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
        <Delta pct={delta} />{sub}
      </div>
    </>
  );
  const base = 'block rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition';
  return to
    ? <Link to={to} className={cn(base, 'hover:shadow-md hover:ring-brand-300')}>{body}</Link>
    : <div className={base}>{body}</div>;
}

function TodoList({ items, empty }) {
  if (!items?.length) {
    return <p className="flex items-center gap-2 text-sm font-medium text-emerald-600"><CheckCircle2 className="size-4" /> {empty}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((i) => {
        const row = (
          <>
            <span className={cn('size-2 shrink-0 rounded-full', DOT[i.tone])} />
            <span className="flex-1 text-sm text-slate-700">{i.label}</span>
            <Badge tone={i.tone}>{i.count}</Badge>
            {i.to && <ArrowRight className="size-4 text-slate-300 transition group-hover:text-brand-500" />}
          </>
        );
        const cls = 'group flex items-center gap-3 rounded-lg px-3 py-2.5 ring-1 ring-inset ring-slate-200/80';
        return (
          <li key={i.key}>
            {i.to
              ? <Link to={i.to} className={cn(cls, 'transition hover:bg-brand-50/60 hover:ring-brand-200')}>{row}</Link>
              : <div className={cls}>{row}</div>}
          </li>
        );
      })}
    </ul>
  );
}

const MoreLink = ({ to, children }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800">
    {children} <ArrowRight className="size-3.5" />
  </Link>
);

export default function DashboardPage() {
  const { user, can } = useAuth();
  const [auto, setAuto] = useState(true);
  const [mode, setMode] = useState('count');
  const [, setTick] = useState(0);

  const { data, isLoading, error, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api('/admin/dashboard'),
    refetchInterval: auto ? 60_000 : false,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);       // met à jour « il y a X min »
    return () => clearInterval(t);
  }, []);

  const hello = Number(nowLocal().slice(11, 13)) < 18 ? 'Bonjour' : 'Bonsoir';
  const today = todayYmd();
  const { bookings: b, fleet: f, alerts: al, trips: tr, requests: rq, deals } = data ?? {};

  const kpis = [];
  if (b) {
    kpis.push({ icon: ClipboardList, label: 'Devis agence à traiter', value: b.pending, tone: b.pending ? 'warn' : 'brand',
      sub: `${b.new_today} nouvelle(s) aujourd'hui`, to: '/bookings?status=pending_agency' });
    kpis.push({ icon: Banknote, label: 'Ventes du mois', value: money(b.sales_month), tone: 'gold', delta: b.sales_delta_pct,
      sub: 'vs même période du mois dernier', to: '/bookings' });
    kpis.push({ icon: Wallet, label: 'Encaissé ce mois', value: money(b.cash_month), tone: 'ok', delta: b.cash_delta_pct,
      sub: 'vs même période du mois dernier' });
  }
  if (f) {
    kpis.push({ icon: Bus, label: "Missions aujourd'hui", value: f.today.total, tone: 'brand',
      sub: `${f.today.to_control} à contrôler · ${f.buses.available} bus libres`, to: '/fleet/missions/control' });
  }
  if (al) {
    kpis.push({ icon: BellRing, label: 'Alertes actives', value: al.counts.open + al.counts.acknowledged,
      tone: al.counts.critical ? 'bad' : 'brand', sub: `${al.counts.critical} critique(s)`, to: '/fleet/alerts' });
  }

  const chart = b?.series.map((d) => ({
    key: d.date, label: fmtDayShort(d.date), short: `${d.date.slice(8)}/${d.date.slice(5, 7)}`,
    value: mode === 'count' ? d.count : d.amount,
  }));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{hello}, {user.fullName.split(' ')[0]}</h1>
          <p className="mt-1 text-sm capitalize text-slate-500">{fmtDayLong(today)}{user.branch ? ` · Agence ${user.branch}` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          {dataUpdatedAt > 0 && <span>Mis à jour {agoFromMs(dataUpdatedAt)}</span>}
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Actualisation auto
          </label>
          <Button variant="secondary" size="sm" loading={isFetching} icon={RefreshCw} onClick={() => refetch()}>Actualiser</Button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-600/20">{error.message}</div>}
      {data?.unavailable?.length > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/25">
          Certaines sections sont momentanément indisponibles : {data.unavailable.join(', ')}.
        </div>
      )}
      {isLoading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200/60" />)}</div>}

      {data && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {QUICK.filter((a) => can(a.perm)).map((a) => (
              <Button key={a.label} as={Link} to={a.to} variant="secondary" size="sm" icon={a.icon}>{a.label}</Button>
            ))}
          </div>

          {kpis.length > 0 && <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">{kpis.map((k) => <Kpi key={k.label} {...k} />)}</div>}

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-6">
              {b && (
                <Panel title="Réservations · 30 derniers jours" icon={CalendarCheck}
                       action={<Segmented size="sm" value={mode} onChange={setMode} options={[['count', 'Nombre'], ['amount', 'Montant']]} />}>
                  <BarChart data={chart} format={mode === 'count' ? (v) => `${v} réservation(s)` : money} />
                </Panel>
              )}

              {b && (
                <Panel title="Dernières réservations" icon={ClipboardList} bodyClassName="p-0" action={<MoreLink to="/bookings">Tout voir</MoreLink>}>
                  <div className="overflow-x-auto">
                    <table>
                      <thead><tr><th>Référence</th><th>Client</th><th>Hôtel</th><th>Total</th><th>Statut</th><th>Créée</th></tr></thead>
                      <tbody>
                        {b.latest.map((r) => (
                          <tr key={r.id}>
                            <td><Link to={`/bookings/${r.reference}`} className="font-medium">{r.reference}</Link></td>
                            <td>{r.customer_name}</td>
                            <td>{r.hotel_name || '—'}</td>
                            <td className="whitespace-nowrap">{money(r.total_millimes)}</td>
                            <td><Badge tone={STATUS[r.status]?.cls}>{STATUS[r.status]?.label || r.status}</Badge></td>
                            <td className="whitespace-nowrap text-slate-500">{timeAgo(r.created_at)}</td>
                          </tr>
                        ))}
                        {b.latest.length === 0 && <tr><td colSpan="6" className="text-slate-500">Aucune réservation.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              )}

              {f && (
                <Panel title="Missions du jour" icon={Bus} action={<MoreLink to="/fleet/missions/control">Contrôle du jour</MoreLink>}>
                  <p className="mb-4 text-sm text-slate-500">
                    Parc : {f.buses.available} disponible(s) · {f.buses.on_mission} en mission · {f.buses.unavailable} indisponible(s) · {f.drivers.active} chauffeur(s) en service
                  </p>
                  {f.missions.length === 0 ? <p className="text-sm text-slate-500">Aucune mission aujourd'hui.</p> : (
                    <ul className="divide-y divide-slate-100">
                      {f.missions.map((m) => (
                        <li key={m.id} className="flex items-center gap-4 py-2.5">
                          <span className="w-12 text-sm font-semibold text-brand-700">{hmOf(m.starts_at)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900">{m.title}</span>
                            <span className="block truncate text-xs text-slate-500">{m.driver_name} · Bus {m.bus_code}{m.pax ? ` · ${m.pax} pers.` : ''}</span>
                          </span>
                          <Badge tone={MISSION_STATUS[m.status]?.cls}>{MISSION_STATUS[m.status]?.label}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              )}

              {tr && (
                <Panel title="Prochains départs" icon={Plane} action={<MoreLink to="/trips">Voyages</MoreLink>}>
                  {tr.upcoming.length === 0 ? <p className="text-sm text-slate-500">Aucun départ programmé : pensez à en ajouter.</p> : (
                    <ul className="divide-y divide-slate-100">
                      {tr.upcoming.map((d) => (
                        <li key={d.id} className="flex items-center gap-4 py-2.5">
                          <span className="w-24 text-sm font-semibold text-brand-700">{fmtDate(d.departure_date)}</span>
                          <span className="min-w-0 flex-1">
                            <Link to={`/trips/${d.trip_id}`} className="block truncate text-sm font-medium">{d.title}</Link>
                            <span className="text-xs text-slate-500">{money(d.price_per_person_millimes)} / pers.</span>
                          </span>
                          {d.seats_left != null && (
                            <Badge tone={d.seats_left <= 5 ? 'warn' : 'ok'}>{d.seats_left === 0 ? 'Complet' : `${d.seats_left} place(s)`}</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              )}
            </div>

            <div className="min-w-0 space-y-6">
              <Panel title="À traiter aujourd'hui" icon={CheckCircle2}>
                <TodoList items={data.todo} empty="Rien à traiter. Tout est à jour." />
              </Panel>

              {(data.content.length > 0 || tr || deals) && (
                <Panel title="Contenu du site à mettre à jour" icon={Tag}>
                  <TodoList items={data.content} empty="Le contenu du site est à jour." />
                  {tr && (
                    <p className="mt-4 text-xs text-slate-500">
                      {tr.active} voyage(s) publié(s) · {tr.hidden} masqué(s){deals ? ` · ${deals.active} bon(s) plan(s) en cours` : ''}
                    </p>
                  )}
                </Panel>
              )}

              {al && (
                <Panel title="Alertes" icon={BellRing} action={<MoreLink to="/fleet/alerts">Toutes</MoreLink>}>
                  {al.latest.length === 0 ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-emerald-600"><CheckCircle2 className="size-4" /> Aucune alerte en cours.</p>
                  ) : (
                    <ul className="space-y-3">
                      {al.latest.map((a) => (
                        <li key={a.id} className="flex items-start gap-3">
                          <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[SEV_TONE[a.severity]])} />
                          <span className="min-w-0 text-sm text-slate-700">
                            {a.message}
                            <span className="block text-xs text-slate-400">{timeAgo(a.created_at)}{a.status === 'acknowledged' ? ' · prise en charge' : ''}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              )}

              {rq && (rq.latest_requests.length > 0 || rq.latest_messages.length > 0) && (
                <Panel title="Demandes et messages" icon={Inbox}>
                  {rq.latest_requests.length > 0 && (
                    <>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Demandes de devis ({rq.new_requests})</h4>
                      <ul className="mb-5 space-y-3">
                        {rq.latest_requests.map((r) => (
                          <li key={r.id} className="text-sm">
                            <span className="font-medium text-slate-900">{r.client_name}</span> <span className="text-slate-500">· {r.trip_title}</span>
                            <span className="block text-xs text-slate-500">
                              {r.adults} adulte(s){r.children ? `, ${r.children} enfant(s)` : ''} · <a href={`tel:${r.client_phone}`}>{r.client_phone}</a> · {timeAgo(r.created_at)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {rq.latest_messages.length > 0 && (
                    <>
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <MessageSquare className="size-3.5" /> Messages ({rq.new_messages})
                      </h4>
                      <ul className="space-y-3">
                        {rq.latest_messages.map((m) => (
                          <li key={m.id} className="text-sm">
                            <span className="font-medium text-slate-900">{m.name}</span> <span className="text-xs text-slate-400">{timeAgo(m.created_at)}</span>
                            <span className="block text-xs text-slate-500">{m.message}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Panel>
              )}

              {data.activity?.length > 0 && (
                <Panel title="Activité récente" icon={History}>
                  <ul className="space-y-3">
                    {data.activity.map((a, i) => (
                      <li key={i} className="text-sm text-slate-700">
                        {activityText(a)}{a.label ? <> : <strong className="font-semibold text-slate-900">{a.label}</strong></> : null}
                        <span className="block text-xs text-slate-400">{a.staff_name || 'Système'} · {timeAgo(a.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}