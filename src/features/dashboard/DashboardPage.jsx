import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import BarChart from '@/components/ui/BarChart';
import { useAuth } from '@/features/auth/AuthProvider';
import { MISSION_STATUS } from '@/features/fleet';
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

const SEV = { critical: 'bad', warning: 'warn', info: 'info' };

function Delta({ pct }) {
  if (pct == null) return null;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return <span className={`delta ${up ? 'up' : 'down'}`}><Icon size={14} /> {up ? '+' : ''}{pct.toLocaleString('fr-FR')} %</span>;
}

function Kpi({ label, value, sub, to, tone, delta }) {
  const body = (
    <>
      <span className="kpi-label">{label}</span>
      <strong className={`kpi-value ${tone ? `tone-${tone}` : ''}`}>{value}</strong>
      <span className="kpi-sub">{delta != null && <Delta pct={delta} />} {sub}</span>
    </>
  );
  return to ? <Link to={to} className="card kpi">{body}</Link> : <div className="card kpi">{body}</div>;
}

function Panel({ title, action, children }) {
  return (
    <section className="card panel">
      <div className="panel-head"><h3>{title}</h3>{action}</div>
      {children}
    </section>
  );
}

function TodoList({ items, empty }) {
  if (!items?.length) return <p className="all-good"><Check size={16} /> {empty}</p>;
  return (
    <ul className="todo">
      {items.map((i) => {
        const inner = (
          <>
            <span className={`dot ${i.tone}`} />
            <span className="todo-label">{i.label}</span>
            <span className={`badge ${i.tone}`}>{i.count}</span>
            {i.to && <ArrowRight size={14} className="muted" />}
          </>
        );
        return <li key={i.key}>{i.to ? <Link to={i.to} className="todo-row">{inner}</Link> : <div className="todo-row">{inner}</div>}</li>;
      })}
    </ul>
  );
}

 

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
    const t = setInterval(() => setTick((x) => x + 1), 30_000);      // met à jour « il y a X min »
    return () => clearInterval(t);
  }, []);

  const hour = Number(nowLocal().slice(11, 13));
  const hello = hour < 18 ? 'Bonjour' : 'Bonsoir';
  const today = todayYmd();
  const b = data?.bookings;
  const f = data?.fleet;
  const al = data?.alerts;
  const tr = data?.trips;
  const rq = data?.requests;

  const kpis = [];
  if (b) {
    kpis.push({ label: 'Devis agence à traiter', value: b.pending, tone: b.pending ? 'warn' : '', sub: `${b.new_today} nouvelle(s) aujourd'hui`, to: '/bookings?status=pending_agency' });
    kpis.push({ label: 'Ventes du mois', value: money(b.sales_month), delta: b.sales_delta_pct, sub: 'vs même période du mois dernier', to: '/bookings' });
    kpis.push({ label: 'Encaissé ce mois', value: money(b.cash_month), delta: b.cash_delta_pct, sub: 'vs même période du mois dernier' });
  }
  if (f) kpis.push({ label: 'Missions aujourd\'hui', value: f.today.total, sub: `${f.today.to_control} à contrôler · ${f.buses.available} bus libres`, to: '/fleet/missions/control' });
  if (al) kpis.push({ label: 'Alertes actives', value: al.counts.open + al.counts.acknowledged, tone: al.counts.critical ? 'bad' : '', sub: `${al.counts.critical} critique(s)`, to: '/fleet/alerts' });

  const chart = b?.series.map((d) => ({
    key: d.date, label: fmtDayShort(d.date), short: d.date.slice(8) + '/' + d.date.slice(5, 7),
    value: mode === 'count' ? d.count : d.amount,
  }));

  return (
    <>
      <div className="dash-head">
        <div>
          <h2 className="dash-title">{hello}, {user.fullName.split(' ')[0]}</h2>
          <p className="muted cap" style={{ margin: 0 }}>{fmtDayLong(today)}{user.branch ? ` · Agence ${user.branch}` : ''}</p>
        </div>
        <div className="dash-tools">
          <span className="muted">{dataUpdatedAt ? `Mis à jour ${agoFromMs(dataUpdatedAt)}` : ''}</span>
          <label className="chk" style={{ margin: 0 }}><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Actualisation auto (1 min)</label>
          <button className="btn ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={16} className={isFetching ? 'spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {error && <div className="alert bad">{error.message}</div>}
      {data?.unavailable?.length > 0 && <div className="alert warn">Certaines sections sont momentanément indisponibles : {data.unavailable.join(', ')}.</div>}
      {isLoading && <div className="center">Chargement…</div>}

      {data && (
        <>
       

          {kpis.length > 0 && <div className="kpis">{kpis.map((k) => <Kpi key={k.label} {...k} />)}</div>}

          <div className="dash-grid">
            <div className="dash-col">
              {b && (
                <Panel title="Réservations — 30 derniers jours" action={(
                  <div className="seg">
                    <button className={mode === 'count' ? 'on' : ''} onClick={() => setMode('count')}>Nombre</button>
                    <button className={mode === 'amount' ? 'on' : ''} onClick={() => setMode('amount')}>Montant</button>
                  </div>
                )}>
                  <BarChart data={chart} format={mode === 'count' ? (v) => `${v} réservation(s)` : money} />
                </Panel>
              )}

              {b && (
                <Panel title="Dernières réservations" action={<Link to="/bookings" className="more">Tout voir <ArrowRight size={14} /></Link>}>
                  <table>
                    <thead><tr><th>Référence</th><th>Client</th><th>Hôtel</th><th>Total</th><th>Statut</th><th>Créée</th></tr></thead>
                    <tbody>
                      {b.latest.map((r) => (
                        <tr key={r.id}>
                          <td><Link to={`/bookings/${r.reference}`}>{r.reference}</Link></td>
                          <td>{r.customer_name}</td>
                          <td>{r.hotel_name || '—'}</td>
                          <td>{money(r.total_millimes)}</td>
                          <td><span className={`badge ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.label || r.status}</span></td>
                          <td>{timeAgo(r.created_at)}</td>
                        </tr>
                      ))}
                      {b.latest.length === 0 && <tr><td colSpan="6" className="muted">Aucune réservation.</td></tr>}
                    </tbody>
                  </table>
                </Panel>
              )}

              {f && (
                <Panel title="Missions du jour" action={<Link to="/fleet/missions/control" className="more">Contrôle du jour <ArrowRight size={14} /></Link>}>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Parc : {f.buses.available} disponible(s) · {f.buses.on_mission} en mission · {f.buses.unavailable} indisponible(s) — {f.drivers.active} chauffeur(s) en service
                  </p>
                  {f.missions.length === 0 ? <p className="muted">Aucune mission aujourd'hui.</p> : (
                    <ul className="mini-list">
                      {f.missions.map((m) => (
                        <li key={m.id}>
                          <span className="time">{hmOf(m.starts_at)}</span>
                          <span className="grow"><strong>{m.title}</strong><br /><small className="muted">{m.driver_name} · Bus {m.bus_code}{m.pax ? ` · ${m.pax} pers.` : ''}</small></span>
                          <span className={`badge ${MISSION_STATUS[m.status]?.cls}`}>{MISSION_STATUS[m.status]?.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              )}

              {tr && (
                <Panel title="Prochains départs" action={<Link to="/trips" className="more">Voyages <ArrowRight size={14} /></Link>}>
                  {tr.upcoming.length === 0 ? <p className="muted">Aucun départ programmé : pensez à en ajouter.</p> : (
                    <ul className="mini-list">
                      {tr.upcoming.map((d) => (
                        <li key={d.id}>
                          <span className="time wide">{fmtDate(d.departure_date)}</span>
                          <span className="grow"><Link to={`/trips/${d.trip_id}`}>{d.title}</Link><br /><small className="muted">{money(d.price_per_person_millimes)} / pers.</small></span>
                          {d.seats_left != null && (
                            <span className={`badge ${d.seats_left <= 5 ? 'warn' : 'ok'}`}>{d.seats_left === 0 ? 'Complet' : `${d.seats_left} place(s)`}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              )}
            </div>

            <div className="dash-col">
              <Panel title="À traiter aujourd'hui">
                <TodoList items={data.todo} empty="Rien à traiter. Tout est à jour." />
              </Panel>

              {data.content.length > 0 || tr || data.deals ? (
                <Panel title="Contenu du site à mettre à jour">
                  <TodoList items={data.content} empty="Le contenu du site est à jour." />
                  {tr && <p className="muted" style={{ marginBottom: 0 }}>{tr.active} voyage(s) publié(s) · {tr.hidden} masqué(s){data.deals ? ` · ${data.deals.active} bon(s) plan(s) en cours` : ''}</p>}
                </Panel>
              ) : null}

              {al && (
                <Panel title="Alertes" action={<Link to="/fleet/alerts" className="more">Toutes <ArrowRight size={14} /></Link>}>
                  {al.latest.length === 0 ? <p className="all-good"><Check size={16} /> Aucune alerte en cours.</p> : (
                    <ul className="mini-list">
                      {al.latest.map((a) => (
                        <li key={a.id}>
                          <span className={`dot ${SEV[a.severity]}`} />
                          <span className="grow">{a.message}<br /><small className="muted">{timeAgo(a.created_at)}{a.status === 'acknowledged' ? ' · prise en charge' : ''}</small></span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              )}

              {rq && (rq.latest_requests.length > 0 || rq.latest_messages.length > 0) && (
                <Panel title="Demandes et messages">
                  {rq.latest_requests.length > 0 && <h4 className="mini-title">Demandes de devis ({rq.new_requests})</h4>}
                  <ul className="mini-list">
                    {rq.latest_requests.map((r) => (
                      <li key={r.id}>
                        <span className="grow"><strong>{r.client_name}</strong> · {r.trip_title}<br />
                          <small className="muted">{r.adults} adulte(s){r.children ? `, ${r.children} enfant(s)` : ''} · <a href={`tel:${r.client_phone}`}>{r.client_phone}</a> · {timeAgo(r.created_at)}</small></span>
                      </li>
                    ))}
                  </ul>
                  {rq.latest_messages.length > 0 && <h4 className="mini-title">Messages ({rq.new_messages})</h4>}
                  <ul className="mini-list">
                    {rq.latest_messages.map((m) => (
                      <li key={m.id}>
                        <span className="grow"><strong>{m.name}</strong> <small className="muted">{timeAgo(m.created_at)}</small><br />
                          <small className="muted">{m.message}</small></span>
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