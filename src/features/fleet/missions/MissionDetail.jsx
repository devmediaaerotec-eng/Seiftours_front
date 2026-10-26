import { Copy, Pencil, Play, RotateCcw, ClipboardCheck, Trash2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { fmtDateTime, fmtRange, money } from '@/lib/format';
import { BUS_TYPE, MISSION_TYPE } from '../shared/status';
import MissionBadges from './MissionBadges';
import { missions, useMission, useMissionStatus } from './resource';

export default function MissionDetail({ id, onEdit, onControl, onDuplicate, onClose }) {
  const toast = useToast();
  const { can } = useAuth();
  const { data, isLoading, error } = useMission(id);
  const status = useMissionStatus();
  const remove = missions.useRemove();

  if (isLoading) return <div className="center">Chargement…</div>;
  if (error) return <div className="alert bad">{error.message}</div>;

  const { mission: m, events } = data;
  const canManage = can('missions.manage');
  const canControl = can('missions.control');

  const setStatus = async (to, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await status.mutateAsync({ id: m.id, status: to });
      toast.success('Statut mis à jour.');
    } catch (e) {
      toast.error(e.data?.violations ? Object.values(e.data.violations)[0] : e.message);
    }
  };

  const del = async () => {
    if (!window.confirm('Supprimer cette mission ?')) return;
    try {
      await remove.mutateAsync(m.id);
      toast.success('Mission supprimée.');
      onClose();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const sent = !m.notified_at ? 'Pas encore envoyé au chauffeur'
    : m.needs_resend ? 'Envoyé, puis modifié : à renvoyer'
    : `Envoyé le ${fmtDateTime(m.notified_at)}`;

  return (
    <div>
      <div className="title-row" style={{ marginBottom: 14 }}>
        <div>
          <strong style={{ fontSize: 18 }}>{m.title}</strong><br />
          <small className="muted">{m.reference} · {MISSION_TYPE[m.mission_type]}</small>
        </div>
        <div style={{ marginLeft: 'auto' }}><MissionBadges m={m} /></div>
      </div>

      <div className="detail-grid">
        <section>
          <h4>Horaires</h4>
          <div className="kv">{fmtRange(m.starts_at, m.ends_at)}</div>
        </section>
        <section>
          <h4>Trajet</h4>
          <div className="kv">
            {m.pickup_place || '—'}{m.destination ? ` → ${m.destination}` : ''}
            {m.pax ? <><br />{m.pax} passager(s)</> : null}
          </div>
        </section>

        <section>
          <h4>Chauffeur</h4>
          <div className="person">
            <Avatar src={m.driver_photo} name={m.driver_name} size={40} />
            <div className="kv"><strong>{m.driver_name}</strong><br />
              {m.driver_phone && <a href={`tel:${m.driver_phone}`}>{m.driver_phone}</a>}</div>
          </div>
        </section>
        <section>
          <h4>Bus</h4>
          <div className="kv">
            <strong>{m.bus_code}</strong> · {m.bus_plate}<br />
            {BUS_TYPE[m.bus_type]?.label} · {m.bus_seats} places
          </div>
        </section>

        <section>
          <h4>Client</h4>
          <div className="kv">
            {m.client_name || '—'}
            {m.client_phone && <><br /><a href={`tel:${m.client_phone}`}>{m.client_phone}</a></>}
          </div>
        </section>
        <section>
          <h4>Prix</h4>
          <div className="kv">{m.price_millimes != null ? money(m.price_millimes) : '—'}</div>
        </section>

        {m.notes && (
          <section className="span-2"><h4>Consignes pour le chauffeur</h4><div className="note-box">{m.notes}</div></section>
        )}

        <section>
          <h4>Programme envoyé</h4>
          <div className="kv">{sent}</div>
        </section>
        <section>
          <h4>Contrôle</h4>
          <div className="kv">
            {m.controlled
              ? <>{m.controlled_by_name || '—'} · {fmtDateTime(m.controlled_at)}</>
              : <span className="muted">Pas encore contrôlée</span>}
          </div>
        </section>
        {m.control_note && (
          <section className="span-2"><h4>Note de contrôle</h4><div className="note-box">{m.control_note}</div></section>
        )}
      </div>

      <div className="detail-actions">
        {canControl && <button className="btn" onClick={onControl}><ClipboardCheck size={16} /> Contrôler…</button>}
        {canControl && m.status === 'planned' && (
          <button className="btn ghost" disabled={status.isPending} onClick={() => setStatus('in_progress')}><Play size={16} /> Démarrer</button>
        )}
        {canControl && ['completed', 'not_done', 'cancelled'].includes(m.status) && (
          <button className="btn ghost" disabled={status.isPending}
                  onClick={() => setStatus('planned', 'Rouvrir cette mission (retour à « Planifiée ») ?')}><RotateCcw size={16} /> Rouvrir</button>
        )}
        {canManage && <button className="btn ghost" onClick={onEdit}><Pencil size={16} /> Modifier</button>}
        {canManage && <button className="btn ghost" onClick={() => onDuplicate(m)}><Copy size={16} /> Dupliquer (+7 jours)</button>}
        {canManage && m.status === 'planned' && !m.controlled && (
          <button className="btn danger" onClick={del}><Trash2 size={16} /> Supprimer</button>
        )}
      </div>

      <h4 className="form-section">Historique</h4>
      <ul className="history">
        {events.map((e) => (
          <li key={e.id}>
            <strong>{e.summary}</strong>
            {e.note && <div className="muted">« {e.note} »</div>}
            <small className="muted">{e.staff_name || 'Système'} · {fmtDateTime(e.created_at)}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}