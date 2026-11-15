import { BellRing, ClipboardCheck, Copy, Pencil, Play, RotateCcw, Trash2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { fmtDateTime, fmtRange, money } from '@/lib/format';
import { missionMessage, waLink } from '../shared/liveState';
import { BUS_TYPE, MISSION_TYPE } from '../shared/status';
import CancelSeries from './CancelSeries';
import MissionBadges from './MissionBadges';
import { missions, useDeleteSeries, useMarkNotified, useMission, useMissionStatus } from './resource';
import './missions.css';

const LEG = { aller: 'Aller', retour: 'Retour' };

export default function MissionDetail({ id, onEdit, onControl, onNotice, onDuplicate, onClose }) {
  const toast = useToast();
  const { can } = useAuth();
  const { data, isLoading, error } = useMission(id);
  const status = useMissionStatus();
  const delSeries = useDeleteSeries();
  const markNotified = useMarkNotified();
  const remove = missions.useRemove();

  if (isLoading) return <div className="center">Chargement…</div>;
  if (error) return <div className="alert bad">{error.message}</div>;

  const { mission: m, events, series } = data;
  const canManage = can('missions.manage');
  const canControl = can('missions.control');
  const cancelled = m.status === 'cancelled';
  const inSeries = !!m.series_ref && Number(series?.total) > 1;

  const removeSeries = async () => {
  if (!window.confirm('Supprimer les missions à venir de cette répétition ? Celles déjà envoyées, contrôlées ou passées sont conservées.')) return;
  try {
    const r = await delSeries.mutateAsync(m.series_ref);
    const parts = [];
    if (r.past) parts.push(`${r.past} passée(s)`);
    if (r.notified) parts.push(`${r.notified} déjà envoyée(s) au chauffeur`);
    if (r.done && !r.past) parts.push(`${r.done} déjà traitée(s)`);
    toast.success(`${r.deleted} supprimée(s), ${r.kept} conservée(s)${parts.length ? ` (${parts.join(', ')})` : ''}.`);
    if (r.notified > 0) toast.warn('Pour les missions déjà envoyées, utilisez « Annuler la série » : le chauffeur sera prévenu.');
    if (r.deleted > 0 && r.kept === 0) onClose();
  } catch (e) {
    toast.error(e.message);
  }
};

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

  /* ---------- État d'envoi au chauffeur ---------- */
  const sent = cancelled
    ? (!m.notified_at ? 'Annulée avant envoi : aucun message à envoyer'
      : m.needs_resend ? 'Annulation à communiquer au chauffeur'
      : `Annulation communiquée le ${fmtDateTime(m.notified_at)}`)
    : (!m.notified_at ? 'Pas encore envoyé au chauffeur'
      : m.needs_resend ? 'Envoyé, puis modifié : à renvoyer'
      : `Envoyé le ${fmtDateTime(m.notified_at)}`);

  const showAlert = cancelled
    ? !!m.notified_at && m.needs_resend
    : m.status === 'planned' && (!m.notified_at || m.needs_resend);

  const alertLabel = cancelled ? "Notifier l'annulation à"
    : m.notified_at ? 'Envoyer la mise à jour à' : 'Envoyer le programme à';

  return (
    <div>
      <div className="title-row" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <strong style={{ fontSize: 18 }}>{m.title}</strong>
          {LEG[m.leg] && <span className="muted"> · {LEG[m.leg]}</span>}<br />
          <small className="muted">{m.reference} · {MISSION_TYPE[m.mission_type]}</small>
        </div>
        <div style={{ marginLeft: 'auto' }}><MissionBadges m={m} /></div>
      </div>

      {inSeries && (
        <div className="alert" style={{ marginBottom: 14 }}>
          Mission récurrente : {series.total} occurrences du {series.first_day} au {series.last_day}
          {Number(series.planned) > 0 && ` (${series.planned} encore planifiée(s))`}.
        </div>
      )}

      {showAlert && (
        <div className={`alert ${cancelled ? 'bad' : 'warn'}`} style={{ marginBottom: 14 }}>
          {sent}.
          {m.driver_phone && (
            <> <a
              href={waLink(m.driver_phone, missionMessage(m))}
              target="_blank" rel="noopener noreferrer"
              onClick={() => markNotified.mutate([m.id])}
            >
              {alertLabel} {m.driver_name} par WhatsApp
            </a></>
          )}
        </div>
      )}

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
              {m.driver_phone && <a href={`tel:${m.driver_phone}`}>{m.driver_phone}</a>}
              {m.driver_note && <><br /><small className="muted">Zone : {m.driver_note}</small></>}
            </div>
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
          <h4>{cancelled ? 'Communication au chauffeur' : 'Programme envoyé'}</h4>
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
          <section className="span-2">
            <h4>{cancelled ? "Motif d'annulation" : 'Note de contrôle'}</h4>
            <div className="note-box">{m.control_note}</div>
          </section>
        )}
      </div>

      <div className="detail-actions">
        {canControl && (
          <button className="btn primary-action" onClick={onControl}><ClipboardCheck size={16} /> Contrôler…</button>
        )}
        {canControl && m.status === 'planned' && (
          <button className="btn ghost" disabled={status.isPending} onClick={() => setStatus('in_progress')}><Play size={16} /> Démarrer</button>
        )}
        {canControl && ['completed', 'not_done', 'cancelled'].includes(m.status) && (
          <button className="btn ghost" disabled={status.isPending}
                  onClick={() => setStatus('planned', 'Rouvrir cette mission (retour à « Planifiée ») ?')}><RotateCcw size={16} /> Rouvrir</button>
        )}
        {canManage && m.driver_phone && (
          <button className="btn ghost" onClick={onNotice}><BellRing size={16} /> Message…</button>
        )}
        {canManage && <button className="btn ghost" onClick={onEdit}><Pencil size={16} /> Modifier</button>}
        {canManage && <button className="btn ghost" onClick={() => onDuplicate(m)}><Copy size={16} /> Dupliquer</button>}
        {canManage && inSeries && <CancelSeries mission={m} series={series} />}
        {canManage && m.status === 'planned' && !m.controlled && (
          <button className="btn danger" onClick={del}><Trash2 size={16} /> Supprimer</button>
        )}
        {canManage && m.series_ref && (
          <button className="btn ghost" disabled={delSeries.isPending} onClick={removeSeries}>
            <Trash2 size={16} /> Supprimer la série…
          </button>
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