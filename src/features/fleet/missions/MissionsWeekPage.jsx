import { Fragment, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Send } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import { addDays, fmtDayShort, hmOf, missionDays, mondayOf, todayYmd } from '@/lib/format';
import { BUS_TYPE, DRIVER_STATUS, MISSION_STATUS } from '../shared/status';
import MissionModal from './MissionModal';
import MissionTabs from './MissionTabs';
import WeekProgramModal from './WeekProgramModal';
import { useWeek } from './resource';

function Chip({ m, day, rows, onOpen }) {
  const first = missionDays(m)[0] === day;
  return (
    <button type="button" className={`chip st-${m.status}`} onClick={() => onOpen(m)}
            title={`${m.title} — ${m.reference}`}>
      <span className="chip-time">{first ? hmOf(m.starts_at) : '↳ suite'}</span>
      <span className="chip-title">{m.title}</span>
      <span className="chip-sub">{rows === 'drivers' ? m.bus_code : m.driver_name}{m.pax ? ` · ${m.pax} p.` : ''}</span>
      <span className="chip-flags">
        {m.changes_count > 0 && <span title="Modifiée">✎</span>}
        {m.needs_resend && <i className="chip-dot" title="À envoyer ou à renvoyer au chauffeur" />}
      </span>
    </button>
  );
}

export default function MissionsWeekPage() {
  const { can } = useAuth();
  const canManage = can('missions.manage');
  const [params, setParams] = useSearchParams();
  const today = todayYmd();
  const start = mondayOf(params.get('start') || today);
  const rows = params.get('rows') === 'buses' ? 'buses' : 'drivers';

  const { data, isLoading, error } = useWeek(start);
  const [target, setTarget] = useState(null);
  const [showProgram, setShowProgram] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);

  const cells = useMemo(() => {
    const map = new Map();
    (data?.missions ?? []).forEach((m) => {
      const [s, e] = missionDays(m);
      const key = rows === 'drivers' ? m.driver_id : m.bus_id;
      days.forEach((d) => {
        if (s <= d && d <= e) {
          const k = `${key}|${d}`;
          if (!map.has(k)) map.set(k, []);
          map.get(k).push(m);
        }
      });
    });
    return map;
  }, [data, rows, days]);

  const open = (t) => setTarget({ ...t, key: Date.now() });
  const go = (newStart) => {
    const next = new URLSearchParams(params);
    next.set('start', newStart);
    setParams(next);
  };
  const setRows = (r) => {
    const next = new URLSearchParams(params);
    next.set('rows', r);
    setParams(next);
  };

  const rowItems = rows === 'drivers' ? data?.drivers ?? [] : data?.buses ?? [];
  const label = `${fmtDayShort(days[0])} – ${fmtDayShort(days[6])} ${days[6].slice(0, 4)}`;

  return (
    <>
      <PageHeader title="Missions" action={(
        <div className="row-tools">
          {canManage && (
            <button className="btn ghost" onClick={() => setShowProgram(true)}>
              <Send size={16} /> Envoyer le programme{data?.to_send ? ` (${data.to_send})` : ''}
            </button>
          )}
          {canManage && <button className="btn" onClick={() => open({ mode: 'new', defaults: { date: today } })}><Plus size={16} /> Nouvelle mission</button>}
        </div>
      )} />
      <MissionTabs />

      <div className="week-bar">
        <button className="btn ghost sm" onClick={() => go(addDays(start, -7))} aria-label="Semaine précédente"><ChevronLeft size={16} /></button>
        <button className="btn ghost sm" onClick={() => go(mondayOf(today))}>Cette semaine</button>
        <button className="btn ghost sm" onClick={() => go(addDays(start, 7))} aria-label="Semaine suivante"><ChevronRight size={16} /></button>
        <input type="date" style={{ width: 'auto' }} value={start} onChange={(e) => e.target.value && go(mondayOf(e.target.value))} />
        <span className="label cap">{label}</span>
        <div className="seg" style={{ marginLeft: 'auto' }}>
          <button className={rows === 'drivers' ? 'on' : ''} onClick={() => setRows('drivers')}>Par chauffeur</button>
          <button className={rows === 'buses' ? 'on' : ''} onClick={() => setRows('buses')}>Par bus</button>
        </div>
      </div>

      {error && <div className="alert bad">{error.message}</div>}
      {isLoading && <div className="center">Chargement…</div>}

      {data && (
        <div className="week-scroll">
          <div className="week-grid">
            <div className="wk-head wk-corner">{rows === 'drivers' ? 'Chauffeur' : 'Bus'}</div>
            {days.map((d) => <div key={d} className={`wk-head ${d === today ? 'today' : ''}`}>{fmtDayShort(d)}</div>)}

            {rowItems.map((row) => (
              <Fragment key={row.id}>
                <div className="wk-row-label">
                  {rows === 'drivers' ? (
                    <div className="person">
                      <Avatar src={row.photo_url} name={row.full_name} size={34} />
                      <div>
                        <strong>{row.full_name}</strong><br />
                        <small className="muted">{row.bus_code ? `Bus ${row.bus_code}` : 'Sans bus attitré'}</small>
                        {row.status !== 'active' && <> <span className="badge warn">{DRIVER_STATUS[row.status]?.label}</span></>}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <strong>{row.code}</strong> <span className={`badge ${BUS_TYPE[row.bus_type]?.cls}`}>{BUS_TYPE[row.bus_type]?.label}</span><br />
                      <small className="muted">{row.plate_number} · {row.driver_name || 'Sans chauffeur attitré'}</small>
                    </div>
                  )}
                </div>

                {days.map((d) => (
                  <div key={d} className={`wk-cell ${d === today ? 'today' : ''}`}>
                    {(cells.get(`${row.id}|${d}`) ?? []).map((m) => (
                      <Chip key={m.id} m={m} day={d} rows={rows} onOpen={(x) => open({ mode: 'detail', id: x.id })} />
                    ))}
                    {canManage && (
                      <button type="button" className="wk-add" aria-label="Ajouter une mission"
                              onClick={() => open({
                                mode: 'new',
                                defaults: rows === 'drivers'
                                  ? { date: d, driver_id: row.id, bus_id: row.assigned_bus_id }
                                  : { date: d, bus_id: row.id, driver_id: row.driver_id },
                              })}><Plus size={14} /></button>
                    )}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {data && rowItems.length === 0 && <p className="muted">Aucun {rows === 'drivers' ? 'chauffeur' : 'bus'} actif.</p>}

      <div className="legend">
        {Object.entries(MISSION_STATUS).map(([k, s]) => <span key={k}><i className={`lg st-${k}`} />{s.label}</span>)}
        <span><i className="chip-dot static" /> À envoyer / à renvoyer au chauffeur</span>
        <span>✎ Modifiée depuis sa création</span>
        {data && <span style={{ marginLeft: 'auto' }}>{data.missions.length} mission(s) cette semaine</span>}
      </div>

      {target && <MissionModal key={target.key} target={target} onClose={() => setTarget(null)} />}
      {showProgram && <WeekProgramModal start={start} onClose={() => setShowProgram(false)} />}
    </>
  );
}