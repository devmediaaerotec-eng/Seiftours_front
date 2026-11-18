import { useFormContext } from 'react-hook-form';
import { Building2 } from 'lucide-react';
import { useClients } from '../resource';
import { dm, hm } from './utils';

/** Rappel du client en haut des étapes 2 et 3. withLegs : ajoute le résumé Aller / Retour. */
export default function ClientBar({ withLegs = false }) {
  const { watch } = useFormContext();
  const clients = useClients();
  const id = watch('client_id');
  const title = (watch('title') || '').trim();
  const legs = watch('legs') ?? [];
  const client = (clients.data?.items ?? []).find((c) => String(c.id) === String(id));
  const t = (v) => (v ? `${dm(v)} · ${hm(v.replace('T', ' '))}` : '—');

  return (
    <div className="wz-clientbar">
      <div className="wz-clientbar-main">
        <span className="wz-clientbar-ico"><Building2 size={16} /></span>
        <div>
          <strong>{client?.name ?? 'Sans client'}</strong>
          {title && <small>{title}</small>}
        </div>
      </div>
      {withLegs && (
        <div className="wz-clientbar-legs">
          {legs.map((l, i) => (
            <span key={i} className={`wz-chip ${l.leg === 'retour' ? 'retour' : ''}`}>
              <b>{l.leg === 'retour' ? 'Retour' : l.leg === 'aller' ? 'Aller' : 'Étape'}</b>
              {t(l.starts_at)} → {hm((l.ends_at || '').replace('T', ' '))}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}