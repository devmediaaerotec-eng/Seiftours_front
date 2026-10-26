import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { addDays, fmtDateTime, fmtDayLong, hmOf, nowLocal, todayYmd } from '@/lib/format';
import StatCards from '../shared/StatCards';
import MissionBadges from './MissionBadges';
import MissionModal from './MissionModal';
import MissionTabs from './MissionTabs';
import { useBulkComplete, useDay, useMissionControl } from './resource';

export default function MissionsControlPage() {
  const toast = useToast();
  const { can } = useAuth();
  const canControl = can('missions.control');
  const [params, setParams] = useSearchParams();
  const today = todayYmd();
  const date = params.get('date') || today;

  const { data, isLoading, error } = useDay(date);
  const control = useMissionControl();
  const bulk = useBulkComplete();
  const [onlyPending, setOnlyPending] = useState(false);
  const [target, setTarget] = useState(null);

  const open = (t) => setTarget({ ...t, key: Date.now() });
  const goto = (d) => {
    const next = new URLSearchParams(params);
    if (d === today) next.delete('date'); else next.set('date', d);
    setParams(next);
  };

  const items = data?.missions ?? [];
  const shown = onlyPending ? items.filter((m) => m.needs_control) : items;
  const stats = data?.stats;
  const started = (m) => m.starts_at.slice(0, 16) <= nowLocal();
  const pendingIds = items.filter((m) => m.needs_control).map((m) => m.id);

  const quick = (m) =>
    control.mutate({ id: m.id, result: 'as_planned' }, {
      onSuccess: () => toast.success(`${m.reference} : effectuée.`),
      onError: (e) => toast.error(e.message),
    });

  const validateAll = () => {
    if (!window.confirm(`Marquer ${pendingIds.length} mission(s) terminée(s) comme « effectuées comme prévu » ?`)) return;
    bulk.mutate(pendingIds, {
      onSuccess: (r) => toast.success(`${r.updated} mission(s) validée(s).`),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <>
      <PageHeader title="Missions" />
      <MissionTabs />

      <div className="week-bar">
        <button className="btn ghost sm" onClick={() => goto(addDays(date, -1))} aria-label="Jour précédent"><ChevronLeft size={16} /></button>
        <button className="btn ghost sm" onClick={() => goto(today)}>Aujourd'hui</button>
        <button className="btn ghost sm" onClick={() => goto(addDays(date, 1))} aria-label="Jour suivant"><ChevronRight size={16} /></button>
        <input type="date" style={{ width: 'auto' }} value={date} onChange={(e) => e.target.value && goto(e.target.value)} />
        <span className="label cap">{fmtDayLong(date)}</span>
        {canControl && pendingIds.length > 0 && (
          <button className="btn" style={{ marginLeft: 'auto' }} disabled={bulk.isPending} onClick={validateAll}>
            <Check size={16} /> Tout valider comme prévu ({pendingIds.length})
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
        { label: 'Missions du jour', value: stats?.total, active: !onlyPending, onClick: () => setOnlyPending(false) },
        { label: 'À contrôler', value: stats?.to_control, tone: stats?.to_control ? 'warn' : '', active: onlyPending, onClick: () => setOnlyPending(true) },
        { label: 'Effectuées', value: stats?.completed },
        { label: 'Non effectuées', value: stats?.not_done, tone: stats?.not_done ? 'warn' : '' },
        { label: 'Annulées', value: stats?.cancelled },
      ]} />

      {error && <div className="alert bad">{error.message}</div>}

      <div className="card">
        <table>
          <thead>
            <tr><th>Horaires</th><th>Mission</th><th>Chauffeur</th><th>Bus</th><th>Statut</th><th>Contrôle</th><th /></tr>
          </thead>
          <tbody>
            {shown.map((m) => (
              <tr key={m.id} className={m.needs_control ? 'row-warn' : ''}>
                <td><strong>{hmOf(m.starts_at)}</strong> → {hmOf(m.ends_at)}
                  {m.starts_at.slice(0, 10) !== m.ends_at.slice(0, 10) && <><br /><small className="muted">multi-jours</small></>}</td>
                <td>
                  <strong>{m.title}</strong><br />
                  <small className="muted">
                    {m.reference}{m.client_name ? ` · ${m.client_name}` : ''}
                    {m.pickup_place || m.destination ? ` · ${[m.pickup_place, m.destination].filter(Boolean).join(' → ')}` : ''}
                  </small>
                </td>
                <td><div className="person"><Avatar src={m.driver_photo} name={m.driver_name} size={30} /><span>{m.driver_name}</span></div></td>
                <td>{m.bus_code}<br /><small className="muted">{m.bus_plate}</small></td>
                <td><MissionBadges m={m} /></td>
                <td>
                  {m.controlled
                    ? <><small>{m.controlled_by_name} · {fmtDateTime(m.controlled_at)}</small>
                        {m.control_note && <div className="muted" style={{ fontSize: 12 }}>« {m.control_note} »</div>}</>
                    : <span className="muted">—</span>}
                </td>
                <td>
                  <div className="table-actions">
                    {canControl && ['planned', 'in_progress'].includes(m.status) && (
                      <button className="btn sm" disabled={!started(m) || control.isPending}
                              title={started(m) ? 'Effectuée comme prévu' : 'Pas encore commencée'}
                              onClick={() => quick(m)}><Check size={14} /> Effectuée</button>
                    )}
                    {canControl && <button className="btn ghost sm" onClick={() => open({ mode: 'control', id: m.id })}>Contrôler…</button>}
                    <button className="btn ghost sm" onClick={() => open({ mode: 'detail', id: m.id })}>Détails</button>
                  </div>
                </td>
              </tr>
            ))}
            {isLoading && <tr><td colSpan="7" className="muted">Chargement…</td></tr>}
            {!isLoading && shown.length === 0 && <tr><td colSpan="7" className="muted">Aucune mission {onlyPending ? 'à contrôler' : 'ce jour-là'}.</td></tr>}
          </tbody>
        </table>
      </div>

      {target && <MissionModal key={target.key} target={target} onClose={() => setTarget(null)} />}
    </>
  );
}