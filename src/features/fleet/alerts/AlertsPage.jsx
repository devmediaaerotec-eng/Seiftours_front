import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import {
  BellRing, Bus, CheckCircle2, Hand, Info, MapPin, Plus, RefreshCw, RotateCcw, ShieldAlert, ShieldCheck, TriangleAlert,
  UserRound, ClipboardList,
} from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Field from '@/components/ui/Field';
import { FilterBar, SearchBox } from '@/components/ui/Filters';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import RadioCards from '@/components/ui/RadioCards';
import Segmented from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { errText } from '@/lib/errors';
import { fmtDateTime, timeAgo } from '@/lib/format';
import { useMissionOptions } from '../missions/resource';
import { ALERT_TYPE, SEVERITY } from '../shared/alerts';
import StatCards from '../shared/StatCards';
import { alerts, useAlertAction, useCreateAlert, useOpenAlertsCount, useRunChecks } from './hooks';

const SEV_STYLE = {
  critical: { border: 'border-l-red-500', icon: 'bg-red-50 text-red-600' },
  warning: { border: 'border-l-amber-500', icon: 'bg-amber-50 text-amber-600' },
  info: { border: 'border-l-sky-500', icon: 'bg-sky-50 text-sky-600' },
};

const Chip = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
    <Icon className="size-3.5 text-slate-400" /> {children}
  </span>
);

function AlertCard({ a, canManage, busy, onAck, onResolve, onReopen }) {
  const t = ALERT_TYPE[a.type] ?? ALERT_TYPE.incident;
  const s = SEVERITY[a.severity];
  const st = SEV_STYLE[a.severity] ?? SEV_STYLE.info;
  const Icon = t.icon;

  return (
    <article className={cn('flex flex-col gap-4 rounded-xl border-l-4 bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:flex-row sm:items-start sm:p-5', st.border, a.status === 'resolved' && 'opacity-75')}>
      <div className="flex items-start gap-3 sm:contents">
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', st.icon)}><Icon className="size-5" /></span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={s.cls}>{s.label}</Badge>
            <Badge>{t.label}</Badge>
            {a.source === 'manual' && <Badge tone="teal">Signalé</Badge>}
            {a.status === 'acknowledged' && <Badge tone="info"><Hand className="size-3" />Pris en charge</Badge>}
            <span className="text-xs text-slate-400">{timeAgo(a.created_at)}</span>
          </div>

          <p className="mt-2 text-[15px] font-medium leading-snug text-slate-900">{a.message}</p>

          {(a.bus_code || a.driver_name || a.mission_reference || a.lat != null) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {a.bus_code && <Chip icon={Bus}>Bus {a.bus_code}</Chip>}
              {a.driver_name && <Chip icon={UserRound}>{a.driver_name}</Chip>}
              {a.mission_reference && <Chip icon={ClipboardList}>Mission {a.mission_reference}</Chip>}
              {a.lat != null && (
                <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100">
                  <MapPin className="size-3.5" /> Voir sur la carte
                </a>
              )}
            </div>
          )}

          {a.status === 'acknowledged' && (
            <p className="mt-3 text-xs text-slate-500">Pris en charge par {a.acknowledged_by_name || '—'} · {fmtDateTime(a.acknowledged_at)}</p>
          )}
          {a.status === 'resolved' && (
            <p className="mt-3 text-xs text-slate-500">
              Résolue {a.resolved_by_name ? `par ${a.resolved_by_name}` : 'automatiquement'} · {fmtDateTime(a.resolved_at)}
              {a.resolution_note ? <span className="block italic">« {a.resolution_note} »</span> : null}
            </p>
          )}
        </div>
      </div>

      {canManage && (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-44 sm:shrink-0 sm:flex-col">
          {a.status === 'open' && <Button variant="secondary" size="sm" icon={Hand} className="w-full" disabled={busy} onClick={onAck}>Prendre en charge</Button>}
          {a.status !== 'resolved' && <Button size="sm" icon={CheckCircle2} className="w-full" disabled={busy} onClick={onResolve}>Résoudre</Button>}
          {a.status === 'resolved' && <Button variant="secondary" size="sm" icon={RotateCcw} className="w-full" disabled={busy} onClick={onReopen}>Rouvrir</Button>}
        </div>
      )}
    </article>
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
    } catch (e) { toast.error(errText(e)); }
  });

  return (
    <Modal title="Résoudre l'alerte" size="sm" onClose={onClose}>
      <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{alert.message}</p>
      <form onSubmit={submit} noValidate className="mt-4">
        <Field label="Remarque (optionnelle)" error={errors.note} hint="Gardez une trace de ce qui a été fait.">
          <textarea rows="3" placeholder="Ex. Assurance renouvelée le 12/11, attestation classée."
                    {...register('note', { maxLength: { value: 1000, message: '1000 caractères maximum' } })} />
        </Field>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Annuler</Button>
          <Button type="submit" icon={CheckCircle2} className="w-full sm:w-auto" loading={act.isPending}>Marquer comme résolue</Button>
        </div>
      </form>
    </Modal>
  );
}

function IncidentModal({ onClose }) {
  const toast = useToast();
  const create = useCreateAlert();
  const options = useMissionOptions();
  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm({
    defaultValues: { severity: 'warning', message: '', bus_id: '', driver_id: '' },
  });
  const message = watch('message') ?? '';

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
      } else toast.error(errText(e));
    }
  });

  return (
    <Modal title="Signaler un incident" onClose={onClose}>
      <div className="mb-5 flex gap-3 rounded-lg bg-brand-50 p-3 text-xs leading-relaxed text-brand-900">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
        <p>
          Un incident est une alerte créée <strong>à la main</strong> pour garder une trace d'un événement que le système ne détecte pas
          (panne signalée par téléphone, chauffeur absent, plainte d'un client…). Il reste ouvert jusqu'à ce que quelqu'un le résolve.
        </p>
      </div>

      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Gravité</span>
          <RadioCards name="severity" register={register} className="grid-cols-1 sm:grid-cols-3" options={[
            { value: 'critical', label: 'Critique', icon: ShieldAlert, description: 'Accident, panne avec passagers à bord' },
            { value: 'warning', label: 'Attention', icon: TriangleAlert, description: 'Chauffeur absent, bus immobilisé' },
            { value: 'info', label: 'Info', icon: Info, description: 'Petit incident, simple trace' },
          ]} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <Field label="Description *" error={errors.message}
               hint={<span className={message.length > 255 ? 'font-medium text-red-600' : ''}>{message.length}/255 · Ex. Panne de climatisation signalée par le chauffeur à 14 h.</span>}>
          <textarea rows="3" {...register('message', { required: 'Décrivez la situation', maxLength: { value: 255, message: '255 caractères maximum' } })} />
        </Field>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Annuler</Button>
          <Button type="submit" icon={Plus} className="w-full sm:w-auto" loading={create.isPending}>Signaler</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AlertsPage() {
  const toast = useToast();
  const qc = useQueryClient();
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

  // La liste se rafraîchit toute seule toutes les 30 secondes
  useEffect(() => {
    const t = setInterval(() => qc.invalidateQueries({ queryKey: alerts.keys.all }), 30_000);
    return () => clearInterval(t);
  }, [qc]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const doAct = (a, action, msg) =>
    act.mutate({ id: a.id, action }, { onSuccess: () => toast.success(msg), onError: (e) => toast.error(errText(e)) });

  const check = () =>
    run.mutate(undefined, {
      onSuccess: (r) => (r.busy
        ? toast.warn('Une vérification est déjà en cours.')
        : toast.success(`Vérification terminée : ${r.created} nouvelle(s), ${r.resolved} résolue(s).`)),
      onError: (e) => toast.error(errText(e)),
    });

  const c = count.data;
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Alertes"
        description="Situations à surveiller : documents, contrôles, programmes non envoyés, incidents signalés."
        action={canManage && (
          <>
            <Button variant="secondary" icon={RefreshCw} loading={run.isPending} onClick={check}>Vérifier maintenant</Button>
            <Button icon={Plus} onClick={() => setCreating(true)}>Signaler un incident</Button>
          </>
        )}
      />

      <StatCards items={[
        { label: 'À traiter', value: c?.open, icon: BellRing, tone: c?.open ? 'warn' : undefined, active: status === 'open', onClick: () => update({ status: 'open', page: '' }) },
        { label: 'Prises en charge', value: c?.acknowledged, icon: Hand, active: status === 'acknowledged', onClick: () => update({ status: 'acknowledged', page: '' }) },
        { label: 'Critiques en cours', value: c?.critical, icon: ShieldAlert, tone: c?.critical ? 'bad' : undefined, active: severity === 'critical', onClick: () => update({ severity: 'critical', status: 'active', page: '' }) },
        { label: 'Résolues (7 jours)', value: c?.resolved_week, icon: CheckCircle2, tone: 'ok', active: status === 'resolved', onClick: () => update({ status: 'resolved', page: '' }) },
      ]} />

      <FilterBar>
        <Segmented value={status} onChange={(v) => update({ status: v === 'active' ? '' : v, page: '' })}
                   options={[['active', 'Actives'], ['resolved', 'Résolues'], ['all', 'Toutes']]} />
        <SearchBox value={search} onChange={setSearch} onSubmit={() => update({ q: search.trim(), page: '' })} placeholder="Message, bus, chauffeur…" />
        <select className="w-full sm:w-auto sm:min-w-44" value={severity} onChange={(e) => update({ severity: e.target.value, page: '' })}>
          <option value="">Toutes les gravités</option>
          {Object.entries(SEVERITY).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <select className="w-full sm:w-auto sm:min-w-44" value={type} onChange={(e) => update({ type: e.target.value, page: '' })}>
          <option value="">Tous les types</option>
          {Object.entries(ALERT_TYPE).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
        </select>
      </FilterBar>

      {error && <Alert tone="bad">{error.message}</Alert>}
      {isLoading && items.length === 0 && (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200/60" />)}</div>
      )}

      {!isLoading && items.length === 0 && (
        <Card padded={false}>
          <EmptyState icon={ShieldCheck} title={status === 'active' && !severity && !type && !q ? 'Aucune alerte en cours' : 'Aucune alerte pour ces critères'}
                      text={status === 'active' && !severity && !type && !q ? 'Tout est en ordre. Cette page se met à jour automatiquement.' : 'Modifiez vos filtres pour élargir la recherche.'} />
        </Card>
      )}

      <div className="space-y-3">
        {items.map((a) => (
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