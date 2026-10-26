import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import { useAuth } from '@/features/auth/AuthProvider';
import { fmtRange, money, todayYmd } from '@/lib/format';
import { MISSION_STATUS, MISSION_TYPE } from '../shared/status';
import MissionBadges from './MissionBadges';
import MissionModal from './MissionModal';
import MissionTabs from './MissionTabs';
import { missions, useMissionOptions } from './resource';

export default function MissionsListPage() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const [from, to, status, type, driver, bus, q, control] = ['from', 'to', 'status', 'type', 'driver', 'bus', 'q', 'control'].map(get);
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);
  const [target, setTarget] = useState(null);

  const options = useMissionOptions();
  const { data, isLoading, error } = missions.useList({
    from, to, status, type, driver, bus, q, control, page, limit: 20, order: control ? 'asc' : 'desc',
  });

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };
  const open = (t) => setTarget({ ...t, key: Date.now() });

  return (
    <>
      <PageHeader title="Missions" action={can('missions.manage') && (
        <button className="btn" onClick={() => open({ mode: 'new', defaults: { date: todayYmd() } })}><Plus size={16} /> Nouvelle mission</button>
      )} />
      <MissionTabs />

      <div className="filters wrap">
        <form onSubmit={(e) => { e.preventDefault(); update({ q: search.trim(), page: '' }); }}>
          <input placeholder="Référence, client, trajet, chauffeur, bus…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn">Rechercher</button>
        </form>
        <input type="date" aria-label="Du" value={from} onChange={(e) => update({ from: e.target.value, page: '' })} />
        <input type="date" aria-label="Au" value={to} onChange={(e) => update({ to: e.target.value, page: '' })} />
        <select value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
          <option value="">Tous les statuts</option>
          {Object.entries(MISSION_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <select value={type} onChange={(e) => update({ type: e.target.value, page: '' })}>
          <option value="">Tous les types</option>
          {Object.entries(MISSION_TYPE).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <select value={driver} onChange={(e) => update({ driver: e.target.value, page: '' })}>
          <option value="">Tous les chauffeurs</option>
          {(options.data?.drivers ?? []).map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
        <select value={bus} onChange={(e) => update({ bus: e.target.value, page: '' })}>
          <option value="">Tous les bus</option>
          {(options.data?.buses ?? []).map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
        </select>
        <label className="chk" style={{ margin: 0, whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={control === 'pending'} onChange={(e) => update({ control: e.target.checked ? 'pending' : '', page: '' })} />
          À contrôler
        </label>
      </div>

      {error && <div className="alert bad">{error.message}</div>}

      <div className="card">
        <table>
          <thead>
            <tr><th>Mission</th><th>Horaires</th><th>Chauffeur · Bus</th><th>Client</th><th>Prix</th><th>Statut</th><th /></tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((m) => (
              <tr key={m.id} className={m.needs_control ? 'row-warn' : ''}>
                <td><strong>{m.title}</strong><br /><small className="muted">{m.reference} · {MISSION_TYPE[m.mission_type]}</small></td>
                <td>{fmtRange(m.starts_at, m.ends_at)}</td>
                <td>{m.driver_name}<br /><small className="muted">Bus {m.bus_code}</small></td>
                <td>{m.client_name || '—'}{m.pax ? <><br /><small className="muted">{m.pax} pers.</small></> : null}</td>
                <td>{m.price_millimes != null ? money(m.price_millimes) : '—'}</td>
                <td><MissionBadges m={m} /></td>
                <td><button className="btn ghost sm" onClick={() => open({ mode: 'detail', id: m.id })}>Détails</button></td>
              </tr>
            ))}
            {isLoading && <tr><td colSpan="7" className="muted">Chargement…</td></tr>}
            {!isLoading && (data?.items ?? []).length === 0 && <tr><td colSpan="7" className="muted">Aucune mission.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 20} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />

      {target && <MissionModal key={target.key} target={target} onClose={() => setTarget(null)} />}
    </>
  );
}