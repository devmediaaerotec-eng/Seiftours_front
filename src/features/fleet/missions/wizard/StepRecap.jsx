import { useFormContext } from 'react-hook-form';
import { CalendarDays, MapPin, Repeat } from 'lucide-react';
import { MISSION_TYPE } from '../../shared/status';
import { useClients } from '../resource';
import { DAYS, LEG_LABEL, dm, hm, occurrenceDates } from './utils';

/** Nombre de missions qui seront créées. */
export function countMissions(v) {
  const days = v.repeat_days ?? [];
  const first = (v.legs?.[0]?.starts_at || '').slice(0, 10);
  const nDays = days.length ? (first && v.repeat_until ? occurrenceDates(first, v.repeat_until, days).length : 0) : 1;
  const perDay = (v.legs ?? []).reduce((n, l) => n + (l.assignments?.length || 0), 0);
  return { nDays, perDay, total: nDays * perDay };
}

export default function StepRecap({ options }) {
  const { watch } = useFormContext();
  const v = watch();
  const clients = useClients();
  const client = (clients.data?.items ?? []).find((c) => String(c.id) === String(v.client_id));
  const dn = (id) => (options?.drivers ?? []).find((d) => String(d.id) === String(id))?.full_name ?? '—';
  const bp = (id) => (options?.buses ?? []).find((b) => String(b.id) === String(id))?.plate_number ?? '—';
  const { nDays, perDay, total } = countMissions(v);
  const days = v.repeat_days ?? [];
  const first = (v.legs?.[0]?.starts_at || '').slice(0, 10);
  const dates = days.length && first && v.repeat_until ? occurrenceDates(first, v.repeat_until, days) : [];

  return (
    <>
      <div className="wz-recap-top">
        <div>
          <span className="wz-eyebrow">{client?.name ?? 'Sans client'} · {MISSION_TYPE[v.mission_type]}</span>
          <h3>{v.title || 'Sans intitulé'}</h3>
          {v.notes && <p className="muted">{v.notes}</p>}
        </div>
      </div>

      {v.legs?.map((l, i) => (
        <div className={`wz-card ${l.leg === 'retour' ? 'retour' : ''}`} key={i}>
          <div className="wz-card-head">
            <span className={`wz-badge ${l.leg === 'retour' ? 'retour' : ''}`}>{LEG_LABEL[l.leg]}</span>
            <span className="wz-recap-line"><CalendarDays size={14} /> {l.starts_at ? `${dm(l.starts_at)} · ${hm(l.starts_at.replace('T', ' '))} → ${hm((l.ends_at || '').replace('T', ' '))}` : '—'}</span>
            {(l.pickup_place || l.destination) && (
              <span className="wz-recap-line"><MapPin size={14} /> {[l.pickup_place, l.destination].filter(Boolean).join(' → ')}</span>
            )}
          </div>
          <ul className="wz-recap-crew">
            {l.assignments?.map((a, j) => (
              <li key={j}>
                <strong>{dn(a.driver_id)}</strong>
                {a.alt_driver_id && days.length > 0 && <span className="wz-pill">alterne avec {dn(a.alt_driver_id)}</span>}
                <span className="muted">Bus {bp(a.bus_id)}</span>
                {a.custom && <span className="wz-pill warn">relais {hm((a.starts_at || '').replace('T', ' '))} → {hm((a.ends_at || '').replace('T', ' '))}</span>}
                {a.note && <span className="muted">· {a.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="wz-card">
        <div className="wz-card-head">
          <Repeat size={15} />
          <strong>Répétition</strong>
        </div>
        <p style={{ margin: 0 }}>
          {days.length === 0
            ? 'Une seule fois.'
            : dates.length
              ? `${DAYS.filter(([n]) => days.includes(n)).map(([, d]) => d).join(', ')} · du ${dm(dates[0])} au ${dm(dates[dates.length - 1])} (${dates.length} jours)`
              : 'Aucun jour ne correspond : revenez à l\'étape 2.'}
        </p>
      </div>

      <div className={`wz-total ${total ? '' : 'empty'}`}>
        {total
          ? <><strong>{total}</strong> mission(s) seront créées <span>({nDays} jour(s) × {perDay} affectation(s))</span></>
          : 'Aucune mission à créer : vérifiez les jours et la date de fin.'}
      </div>
    </>
  );
}