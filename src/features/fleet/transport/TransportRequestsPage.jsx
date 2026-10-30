import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Bus, CalendarDays, CheckCircle2, FileText, Inbox, Mail, MapPin, MessageCircle, Pencil, Phone, PhoneCall, Users, Wallet,
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
import { fmtRange, millimesToTnd, money, timeAgo, tndToMillimes, ymdOf } from '@/lib/format';
import StatCards from '../shared/StatCards';
import { transportRequests, useTransportStats, useUpdateTransportRequest } from './resource';

const STATUS = {
  new: { label: 'Nouvelle', cls: 'warn', icon: Inbox, hint: 'Pas encore traitée' },
  contacted: { label: 'Contactée', cls: 'info', icon: PhoneCall, hint: 'Le client a été rappelé' },
  quoted: { label: 'Devis envoyé', cls: 'teal', icon: FileText, hint: 'En attente de sa réponse' },
  confirmed: { label: 'Confirmée', cls: 'ok', icon: CheckCircle2, hint: 'Location acceptée' },
  declined: { label: 'Refusée', cls: 'muted', icon: Inbox, hint: 'Sans suite' },
};
const PURPOSE = {
  wedding: 'Mariage / événement', excursion: 'Excursion / visite', airport: 'Transfert aéroport', school: 'Sortie scolaire',
  seminar: 'Séminaire / entreprise', circuit: 'Circuit / voyage de groupe', other: 'Autre besoin',
};
const VEHICLE = { any: 'Peu importe', minibus: 'Minibus', microbus: 'Microbus' };

function TreatModal({ row, onClose }) {
  const toast = useToast();
  const update = useUpdateTransportRequest();
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: {
      status: row.status,
      admin_notes: row.admin_notes ?? '',
      quoted: millimesToTnd(row.quoted_total_millimes),
    },
  });

  const submit = handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        id: row.id, status: v.status, admin_notes: v.admin_notes, quoted_total_millimes: tndToMillimes(v.quoted),
      });
      toast.success('Demande mise à jour.');
      onClose();
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        Object.entries(e.data.violations).forEach(([k, m]) => setError(k === 'quoted_total_millimes' ? 'quoted' : k, { type: 'server', message: m }));
      } else toast.error(errText(e));
    }
  });

  return (
    <Modal title={`Traiter la demande ${row.reference}`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Statut</span>
          <RadioCards name="status" register={register} className="grid-cols-1 sm:grid-cols-2"
                      options={Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label, icon: s.icon, description: s.hint }))} />
        </div>
        <Field label="Montant du devis (TND)" error={errors.quoted} hint="Optionnel. Affiché sur la demande.">
          <input inputMode="decimal" {...register('quoted', {
            validate: (v) => v === '' || /^\d+([.,]\d{1,3})?$/.test(v.trim()) || 'Montant invalide (ex. 450 ou 450.500)',
          })} />
        </Field>
        <Field label="Note interne" error={errors.admin_notes}>
          <textarea rows="4" placeholder="Ex. Client rappelé, souhaite un minibus climatisé. Devis envoyé par e-mail." {...register('admin_notes')} />
        </Field>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Annuler</Button>
          <Button type="submit" className="w-full sm:w-auto" loading={update.isPending}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}

function RequestCard({ r, canManage, onTreat }) {
  const s = STATUS[r.status] ?? STATUS.new;
  const digits = String(r.client_phone ?? '').replace(/\D/g, '');
  const a = r.availability;
  const enough = a && a.seats >= r.pax;

  return (
    <article className={cn('rounded-xl border-l-4 bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5', r.status === 'new' ? 'border-l-amber-500' : 'border-l-slate-200')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{r.client_name}</h3>
            <Badge tone={s.cls} dot>{s.label}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{r.reference} · reçue {timeAgo(r.created_at)}</p>
        </div>
        {r.quoted_total_millimes != null && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <Wallet className="size-4" /> {money(r.quoted_total_millimes)}
          </span>
        )}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" /><div><dt className="text-xs text-slate-500">Trajet</dt><dd className="font-medium text-slate-900">{r.pickup_place} → {r.destination}</dd></div></div>
        <div className="flex gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0 text-slate-400" /><div><dt className="text-xs text-slate-500">Période souhaitée</dt><dd className="font-medium text-slate-900">{fmtRange(r.starts_at, r.ends_at)}</dd></div></div>
        <div className="flex gap-2"><Users className="mt-0.5 size-4 shrink-0 text-slate-400" /><div><dt className="text-xs text-slate-500">Groupe</dt><dd className="font-medium text-slate-900">{r.pax} passagers · {PURPOSE[r.purpose]}</dd></div></div>
        <div className="flex gap-2"><Bus className="mt-0.5 size-4 shrink-0 text-slate-400" /><div><dt className="text-xs text-slate-500">Véhicule</dt><dd className="font-medium text-slate-900">{VEHICLE[r.vehicle_pref]}</dd></div></div>
      </dl>

      {a && (
        <p className={cn('mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset',
          a.buses === 0 ? 'bg-red-50 text-red-700 ring-red-600/20' : enough ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-800 ring-amber-600/25')}>
          <Bus className="size-4" />
          {a.buses === 0 ? 'Aucun bus libre sur cette période'
            : `${a.buses} bus libre${a.buses > 1 ? 's' : ''} · ${a.seats} places${enough ? '' : ` (insuffisant pour ${r.pax} personnes)`}`}
        </p>
      )}

      {r.message && <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">« {r.message} »</p>}
      {r.admin_notes && (
        <p className="mt-3 whitespace-pre-line rounded-lg bg-amber-50/70 p-3 text-sm text-slate-800 ring-1 ring-inset ring-amber-200/60">
          <span className="block text-xs font-semibold text-amber-800">Note interne{r.handled_by_name ? ` · ${r.handled_by_name}` : ''}</span>
          {r.admin_notes}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Button as="a" href={`tel:${r.client_phone}`} variant="secondary" size="sm" icon={Phone}>{r.client_phone}</Button>
        {digits && <Button as="a" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm" icon={MessageCircle}>WhatsApp</Button>}
        {r.client_email && <Button as="a" href={`mailto:${r.client_email}`} variant="secondary" size="sm" icon={Mail}>E-mail</Button>}
        <Button as={Link} to={`/fleet/missions?start=${ymdOf(r.starts_at)}`} variant="ghost" size="sm" icon={CalendarDays}>Voir le planning</Button>
        {canManage && <Button size="sm" icon={Pencil} className="sm:ml-auto" onClick={() => onTreat(r)}>Traiter</Button>}
      </div>
    </article>
  );
}

export default function TransportRequestsPage() {
  const { can } = useAuth();
  const canManage = can('missions.manage');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);
  const [treating, setTreating] = useState(null);

  const stats = useTransportStats();
  const { data, isLoading, error } = transportRequests.useList({ status, q, page, limit: 10 });
  const items = data?.items ?? [];
  const s = stats.data;

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Demandes de location" description="Demandes de devis envoyées depuis la page Transport du site." />

      <StatCards items={[
        { label: 'Nouvelles', value: s?.new, icon: Inbox, tone: s?.new ? 'warn' : undefined, active: status === 'new', onClick: () => update({ status: 'new', page: '' }) },
        { label: 'Contactées', value: s?.contacted, icon: PhoneCall, active: status === 'contacted', onClick: () => update({ status: 'contacted', page: '' }) },
        { label: 'Devis envoyés', value: s?.quoted, icon: FileText, active: status === 'quoted', onClick: () => update({ status: 'quoted', page: '' }) },
        { label: 'Confirmées', value: s?.confirmed, icon: CheckCircle2, tone: 'ok', active: status === 'confirmed', onClick: () => update({ status: 'confirmed', page: '' }) },
      ]} />

      <FilterBar>
        <SearchBox value={search} onChange={setSearch} onSubmit={() => update({ q: search.trim(), page: '' })} placeholder="Nom, téléphone, référence, trajet…" />
        <Segmented value={status} onChange={(v) => update({ status: v, page: '' })}
                   options={[['', 'Toutes'], ['new', 'Nouvelles'], ['contacted', 'Contactées'], ['quoted', 'Devis'], ['confirmed', 'Confirmées'], ['declined', 'Refusées']]} />
      </FilterBar>

      {error && <Alert tone="bad">{error.message}</Alert>}
      {isLoading && items.length === 0 && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-200/60" />)}</div>}
      {!isLoading && items.length === 0 && (
        <Card padded={false}><EmptyState icon={Inbox} title="Aucune demande" text="Les demandes envoyées depuis la page Transport du site apparaîtront ici." /></Card>
      )}

      <div className="space-y-3">
        {items.map((r) => <RequestCard key={r.id} r={r} canManage={canManage} onTreat={setTreating} />)}
      </div>

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 10} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />

      {treating && <TreatModal key={treating.id} row={treating} onClose={() => setTreating(null)} />}
    </>
  );
}