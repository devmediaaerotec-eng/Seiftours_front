import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BellRing,Check, ChevronLeft, ChevronRight, FileDown, MessageCircle, Play } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { addDays, fmtDateTime, fmtDayLong, hmOf, todayYmd } from '@/lib/format';
import StatCards from '../shared/StatCards';
 import MissionBadges from './MissionBadges';
import MissionModal from './MissionModal';
import MissionTabs from './MissionTabs';
import { downloadPdf, useBulkComplete, useDay, useMissionControl, useMissionStatus } from './resource';
import { dayMessage, groupDayMessage, LIVE, liveState, sendToGroup, useNow, waLink } from '../shared/liveState';

export default function MissionsControlPage() {
  const toast = useToast();
  const { can } = useAuth();
  const canControl = can('missions.control');
  const canManage = can('missions.manage');
  const [params, setParams] = useSearchParams();
  const today = todayYmd();
  const date = params.get('date') || today;
  const now = useNow();

  const { data, isLoading, error } = useDay(date);
  const control = useMissionControl();
  const status = useMissionStatus();
  const bulk = useBulkComplete();
  // all | late | in_progress | completed | not_done | cancelled | to_control
const [filter, setFilter] = useState(params.get('filter') || 'all');
  const [target, setTarget] = useState(null);
  const [exporting, setExporting] = useState(false);

  const open = (t) => setTarget({ ...t, key: Date.now() });
  const goto = (d) => {
    const next = new URLSearchParams(params);
    if (d === today) next.delete('date'); else next.set('date', d);
    setParams(next);
  };

  const items = useMemo(
    () => (data?.missions ?? []).map((m) => ({ ...m, live: liveState(m, now) })),
    [data, now],
  );

  const sendGroup = async () => {
  const copied = await sendToGroup(groupDayMessage(date, items));
  toast.success(copied ? 'Message copié : choisissez le groupe dans WhatsApp.' : 'WhatsApp ouvert : collez le message.');
};
  const count = (k) => items.filter((m) => m.live === k).length;
  const toControl = useMemo(() => items.filter((m) => m.needs_control), [items]);

  const shown = useMemo(
    () => items.filter((m) => (filter === 'all' ? true : filter === 'to_control' ? m.needs_control : m.live === filter)),
    [items, filter],
  );

  // Un bloc par chauffeur, missions triées par heure, chauffeurs en retard en premier
  const groups = useMemo(() => {
    const g = new Map();
    shown.forEach((m) => {
      if (!g.has(m.driver_id)) {
        g.set(m.driver_id, { id: m.driver_id, name: m.driver_name, photo: m.driver_photo, phone: m.driver_phone, items: [] });
      }
      g.get(m.driver_id).items.push(m);
    });
    g.forEach((d) => {
      d.items.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      d.worst = Math.min(...d.items.map((m) => LIVE[m.live].order));
    });
    return [...g.values()].sort((a, b) => a.worst - b.worst || a.name.localeCompare(b.name));
  }, [shown]);

  const run = (promise, ok) => promise.then(() => toast.success(ok)).catch((e) => toast.error(e.message));
  const done = (m) => run(control.mutateAsync({ id: m.id, result: 'as_planned' }), `${m.reference} : effectuée.`);
  const start = (m) => run(status.mutateAsync({ id: m.id, status: 'in_progress' }), `${m.reference} : démarrée.`);

  const validateAll = () => {
    if (!window.confirm(`Marquer ${toControl.length} mission(s) comme « effectuées comme prévu » ?`)) return;
    bulk.mutate(toControl.map((m) => m.id), {
      onSuccess: (r) => toast.success(`${r.updated} mission(s) validée(s).`),
      onError: (e) => toast.error(e.message),
    });
  };

  const exportPdf = async () => {
    setExporting(true);
    try { await downloadPdf('/day.pdf', { date }, `missions-${date}.pdf`); }
    catch (e) { toast.error(e.message); }
    finally { setExporting(false); }
  };

  const card = (key, label, tone) => ({
    label,
    value: key === 'all' ? items.length : key === 'to_control' ? toControl.length : count(key),
    tone,
    active: filter === key,
    onClick: () => setFilter(filter === key ? 'all' : key),
  });

  return (
    <>
     <PageHeader title="Missions" action={canManage && (
  <div className="row-tools">
    <button className="btn ghost" disabled={!items.length} onClick={sendGroup}>
      <MessageCircle size={16} /> Envoyer au groupe
    </button>
    <button className="btn ghost" disabled={exporting || !items.length} onClick={exportPdf}>
      <FileDown size={16} /> {exporting ? 'Export…' : 'PDF'}
    </button>
  </div>
)} />
      <MissionTabs />

      <div className="week-bar">
        <button className="btn ghost sm" onClick={() => goto(addDays(date, -1))} aria-label="Jour précédent"><ChevronLeft size={16} /></button>
        <button className="btn ghost sm" onClick={() => goto(today)}>Aujourd'hui</button>
        <button className="btn ghost sm" onClick={() => goto(addDays(date, 1))} aria-label="Jour suivant"><ChevronRight size={16} /></button>
        <input type="date" style={{ width: 'auto' }} value={date} onChange={(e) => e.target.value && goto(e.target.value)} />
        <span className="label cap">{fmtDayLong(date)}</span>
        {canControl && toControl.length > 0 && (
          <button className="btn" style={{ marginLeft: 'auto' }} disabled={bulk.isPending} onClick={validateAll}>
            <Check size={16} /> Tout valider comme prévu ({toControl.length})
          </button>
        )}
      </div>

      {data?.overdue > 0 && (
        <div className="alert warn">
          {data.overdue} mission(s) d'une journée précédente n'ont pas été contrôlées.{' '}
          <Link to="/fleet/missions/list?control=pending">Les voir et les contrôler</Link>
        </div>
      )}

      <StatCards items={[
        card('all', 'Missions du jour'),
        card('late', 'En retard', count('late') ? 'bad' : ''),
        card('in_progress', 'En cours'),
        card('completed', 'Effectuées'),
        card('not_done', 'Non effectuées', count('not_done') ? 'warn' : ''),
        card('cancelled', 'Annulées'),
        card('to_control', 'À contrôler', toControl.length ? 'warn' : ''),
      ]} />

      {error && <div className="alert bad">{error.message}</div>}
      {isLoading && <div className="center">Chargement…</div>}
      {!isLoading && groups.length === 0 && (
        <div className="card">
          <p className="muted" style={{ padding: 16, margin: 0 }}>
            Aucune mission {filter === 'all' ? 'ce jour-là' : 'pour ce filtre'}.
          </p>
        </div>
      )}

      {groups.map((d) => (
        <div className="card drv-card" key={d.id}>
          <div className="drv-head">
            <div className="person">
              <Avatar src={d.photo} name={d.name} size={36} />
              <div>
                <strong>{d.name}</strong><br />
                <small className="muted">{d.items.length} mission(s){d.phone ? ` · ${d.phone}` : ''}</small>
              </div>
            </div>
            {canManage && d.phone && (
              <a className="btn ghost sm" style={{ marginLeft: 'auto' }} target="_blank" rel="noopener noreferrer"
                 href={waLink(d.phone, dayMessage(d.name, date, d.items.filter((m) => m.status !== 'cancelled')))}>
                <MessageCircle size={14} /> Envoyer sa journée
              </a>
            )}
          </div>

          <table>
            <tbody>
              {d.items.map((m) => (
                <tr key={m.id} className={m.live === 'late' ? 'row-late' : m.needs_control ? 'row-warn' : ''}>
                  <td style={{ width: 120 }}>
                    <strong>{hmOf(m.starts_at)}</strong> → {hmOf(m.ends_at)}
                    {m.starts_at.slice(0, 10) !== m.ends_at.slice(0, 10) && <><br /><small className="muted">multi-jours</small></>}
                  </td>
                  <td>
                    <strong>{m.title}</strong><br />
                    <small className="muted">
                      {m.reference} · Bus {m.bus_plate}{m.client_name ? ` · ${m.client_name}` : ''}
                      {m.pickup_place || m.destination ? ` · ${[m.pickup_place, m.destination].filter(Boolean).join(' → ')}` : ''}
                    </small>
                    {m.controlled && m.control_note && <div className="muted" style={{ fontSize: 12 }}>« {m.control_note} »</div>}
                  </td>
                  <td>
                    <MissionBadges m={m} now={now} />
                    {m.controlled && <div><small className="muted">{m.controlled_by_name} · {fmtDateTime(m.controlled_at)}</small></div>}
                  </td>
                  <td>
                    <div className="table-actions">
                      {canControl && m.status === 'planned' && (
                        <button className="btn ghost sm" disabled={status.isPending} onClick={() => start(m)}>
                          <Play size={14} /> Démarrer
                        </button>
                      )}
                      {canControl && ['planned', 'in_progress'].includes(m.status) && (
                        <button className="btn sm" disabled={m.live === 'upcoming' || control.isPending}
                                title={m.live === 'upcoming' ? 'Pas encore commencée' : 'Effectuée comme prévu'}
                                onClick={() => done(m)}><Check size={14} /> Effectuée</button>
                      )}
                      {canManage && m.live === 'late' && (
  <button className="btn danger sm" onClick={() => open({ mode: 'notice', id: m.id, kind: 'late' })}>
    <BellRing size={14} /> Relancer
  </button>
)}
                      {canControl && <button className="btn ghost sm" onClick={() => open({ mode: 'control', id: m.id })}>Contrôler…</button>}
                      <button className="btn ghost sm" onClick={() => open({ mode: 'detail', id: m.id })}>Détails</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {target && <MissionModal key={target.key} target={target} onClose={() => setTarget(null)} />}
    </>
  );
}