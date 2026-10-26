import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Plus, RefreshCw } from 'lucide-react';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { fmtDateTime, timeAgo } from '@/lib/format';
import { useMissionOptions } from '../missions/resource';
import { ALERT_TYPE, SEVERITY } from '../shared/alerts';
import StatCards from '../shared/StatCards';
import { alerts, useAlertAction, useCreateAlert, useOpenAlertsCount, useRunChecks } from './hooks';

function AlertCard({ a, canManage, busy, onAck, onResolve, onReopen }) {
  const t = ALERT_TYPE[a.type] ?? ALERT_TYPE.incident;
  const s = SEVERITY[a.severity];
  const Icon = t.icon;
  return (
    <div className={`alert-card sev-${a.severity} ${a.status === 'resolved' ? 'done' : ''}`}>
      <div className="alert-ico"><Icon size={20} /></div>
      <div className="alert-main">
        <div className="alert-top">
          <span className={`badge ${s.cls}`}>{s.label}</span>
          <span className="badge muted">{t.label}</span>
          {a.source === 'manual' && <span className="badge teal">Signalé</span>}
          <small className="muted">{timeAgo(a.created_at)}</small>
        </div>
        <div className="alert-msg">{a.message}</div>
        <div className="alert-meta">
          {a.bus_code && <span>Bus {a.bus_code}</span>}
          {a.driver_name && <span>{a.driver_name}</span>}
          {a.mission_reference && <span>Mission {a.mission_reference}</span>}
          {a.lat != null && <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noopener noreferrer">Voir sur la carte</a>}
        </div>
        {a.status === 'acknowledged' && (
          <small className="muted">Prise en charge par {a.acknowledged_by_name || '—'} · {fmtDateTime(a.acknowledged_at)}</small>
        )}
        {a.status === 'resolved' && (
          <small className="muted">
            Résolue {a.resolved_by_name ? `par ${a.resolved_by_name}` : 'automatiquement'} · {fmtDateTime(a.resolved_at)}
            {a.resolution_note ? ` — « ${a.resolution_note} »` : ''}
          </small>
        )}
      </div>
      {canManage && (
        <div className="alert-actions">
          {a.status === 'open' && <button className="btn ghost sm" disabled={busy} onClick={onAck}>Prendre en charge</button>}
          {a.status !== 'resolved' && <button className="btn sm" disabled={busy} onClick={onResolve}>Résoudre</button>}
          {a.status === 'resolved' && <button className="btn ghost sm" disabled={busy} onClick={onReopen}>Rouvrir</button>}
        </div>
      )}
    </div>
  );
}

function ResolveModal({ alert, onClose }) {
  const toast = useToast();
  const act = useAlertAction();
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { note: '' } });
  const submit = handleSubmit(async ({ note }) => {
    try {
      await act.mutateAsync({ id: alert.id, action: 'resolve', note: note.trim() });
      toast.success('Alerte résolue.');
      onClose();
    } catch (e) { toast.error(e.message); }
  });
  return (
    <Modal title="Résoudre l'alerte" onClose={onClose}>
      <p style={{ marginTop: 0 }}>{alert.message}</p>
      <form onSubmit={submit} noValidate>
        <Field label="Remarque (optionnelle)" error={errors.note}>
          <textarea rows="3" placeholder="Ex. Assurance renouvelée le 12/11, attestation classée." {...register('note', { maxLength: { value: 1000, message: '1000 caractères maximum' } })} />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn" disabled={act.isPending}>Marquer comme résolue</button>
        </div>
      </form>
    </Modal>
  );
}

function IncidentModal({ onClose }) {
  const toast = useToast();
  const create = useCreateAlert();
  const options = useMissionOptions();
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: { severity: 'warning', message: '', bus_id: '', driver_id: '' },
  });
  const submit = handleSubmit(async (v) => {
    try {
      await create.mutateAsync({
        severity: v.severity, message: v.message.trim(),
        bus_id: v.bus_id ? Number(v.bus_id) : null, driver_id: v.driver_id ? Number(v.driver_id) : null,
      });
      toast.success('Incident signalé.');
      onClose();
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        Object.entries(e.data.violations).forEach(([k, m]) => setError(k, { type: 'server', message: m }));
      } else toast.error(e.message);
    }
  });
  return (
    <Modal title="Signaler un incident" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Gravité" error={errors.severity}>
            <select {...register('severity')}>
              {Object.entries(SEVERITY).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </Field>
          <span />
          <Field label="Bus concerné" error={errors.bus_id}>
            <select {...register('bus_id')}>
              <option value="">Aucun</option>
              {(options.data?.buses ?? []).map((b) => <option key={b.id} value={b.id}>{b.code} · {b.plate_number}</option>)}
            </select>
          </Field>
          <Field label="Chauffeur concerné" error={errors.driver_id}>
            <select {...register('driver_id')}>
              <option value="">Aucun</option>
              {(options.data?.drivers ?? []).map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </Field>
          <Field label="Description *" className="span-2" error={errors.message} hint="Ex. Panne de climatisation signalée par le chauffeur à 14 h.">
            <textarea rows="3" {...register('message', {
              required: 'Décrivez la situation',
              maxLength: { value: 255, message: '255 caractères maximum' },
            })} />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn" disabled={create.isPending}>Signaler</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AlertsPage() {
  const toast = useToast();
  const { can } = useAuth();
  const canManage = can('alerts.manage');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'active';
  const severity = params.get('severity') || '';
  const type = params.get('type') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);
  const [resolving, setResolving] = useState(null);
  const [creating, setCreating] = useState(false);

  const count = useOpenAlertsCount(true);
  const { data, isLoading, error } = alerts.useList({ status, severity, type, q, page, limit: 20 });
  const act = useAlertAction();
  const run = useRunChecks();

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const doAct = (a, action, msg) =>
    act.mutate({ id: a.id, action }, { onSuccess: () => toast.success(msg), onError: (e) => toast.error(e.message) });

  const check = () =>
    run.mutate(undefined, {
      onSuccess: (r) => (r.busy ? toast.warn('Une vérification est déjà en cours.')
        : toast.success(`Vérification terminée : ${r.created} nouvelle(s), ${r.resolved} résolue(s).`)),
      onError: (e) => toast.error(e.message),
    });

  const c = count.data;

  return (
    <>
      <PageHeader title="Alertes" action={canManage && (
        <div className="row-tools">
          <button className="btn ghost" disabled={run.isPending} onClick={check}><RefreshCw size={16} className={run.isPending ? 'spin' : ''} /> Vérifier maintenant</button>
          <button className="btn" onClick={() => setCreating(true)}><Plus size={16} /> Signaler un incident</button>
        </div>
      )} />

      <StatCards items={[
        { label: 'À traiter', value: c?.open, tone: c?.open ? 'warn' : '', active: status === 'open', onClick: () => update({ status: 'open', page: '' }) },
        { label: 'Prises en charge', value: c?.acknowledged, active: status === 'acknowledged', onClick: () => update({ status: 'acknowledged', page: '' }) },
        { label: 'Critiques en cours', value: c?.critical, tone: c?.critical ? 'bad' : '', active: severity === 'critical', onClick: () => update({ severity: 'critical', status: 'active', page: '' }) },
        { label: 'Résolues (7 jours)', value: c?.resolved_week, active: status === 'resolved', onClick: () => update({ status: 'resolved', page: '' }) },
      ]} />

      <div className="filters wrap">
        <div className="seg">
          {[['active', 'Actives'], ['resolved', 'Résolues'], ['all', 'Toutes']].map(([k, label]) => (
            <button key={k} className={status === k ? 'on' : ''} onClick={() => update({ status: k === 'active' ? '' : k, page: '' })}>{label}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); update({ q: search.trim(), page: '' }); }}>
          <input placeholder="Message, bus, chauffeur…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn">Rechercher</button>
        </form>
        <select value={severity} onChange={(e) => update({ severity: e.target.value, page: '' })}>
          <option value="">Toutes les gravités</option>
          {Object.entries(SEVERITY).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <select value={type} onChange={(e) => update({ type: e.target.value, page: '' })}>
          <option value="">Tous les types</option>
          {Object.entries(ALERT_TYPE).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
        </select>
      </div>

      {error && <div className="alert bad">{error.message}</div>}
      {isLoading && <div className="center">Chargement…</div>}
      {!isLoading && (data?.items ?? []).length === 0 && (
        <div className="card center muted">Aucune alerte {status === 'active' ? 'en cours. Tout est en ordre.' : 'pour ces critères.'}</div>
      )}

      <div className="alert-list">
        {(data?.items ?? []).map((a) => (
          <AlertCard key={a.id} a={a} canManage={canManage} busy={act.isPending}
                     onAck={() => doAct(a, 'acknowledge', 'Alerte prise en charge.')}
                     onResolve={() => setResolving(a)}
                     onReopen={() => doAct(a, 'reopen', 'Alerte rouverte.')} />
        ))}
      </div>

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 20} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />

      {resolving && <ResolveModal alert={resolving} onClose={() => setResolving(null)} />}
      {creating && <IncidentModal onClose={() => setCreating(false)} />}
    </>
  );
}