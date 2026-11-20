import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Ban, CalendarDays, CheckCircle2, Hourglass, Inbox, Luggage, Mail, MessageCircle, Pencil, Phone, PhoneCall,
  Plane, Store, Users, Wallet, XCircle,
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
import StatCards from '@/features/fleet/shared/StatCards';
import { cn } from '@/lib/cn';
import { errText } from '@/lib/errors';
import { fmtDayShort, millimesToTnd, money, timeAgo, tndToMillimes } from '@/lib/format';
import { flightRequests, useFlightStats, useUpdateFlightRequest } from './resource';

const STATUS = {
  pending_confirmation: { label: 'À traiter', cls: 'warn', icon: Hourglass, hint: 'Pas encore traitée' },
  contacted: { label: 'Client contacté', cls: 'info', icon: PhoneCall, hint: 'Options de vols envoyées' },
  confirmed: { label: 'Confirmée', cls: 'ok', icon: CheckCircle2, hint: 'Billet réservé avec le client' },
  rejected: { label: 'Refusée', cls: 'bad', icon: XCircle, hint: 'Aucun vol ne convient' },
  cancelled: { label: 'Annulée', cls: 'muted', icon: Ban, hint: 'Le client a renoncé' },
};
const CABIN = { economy: 'Économique', premium: 'Premium économique', business: 'Affaires', first: 'Première' };

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
const travellers = (r) =>
  [plural(r.adults, 'adulte'), r.children ? plural(r.children, 'enfant') : null, r.infants ? plural(r.infants, 'bébé') : null]
    .filter(Boolean).join(', ');

function TreatModal({ row, onClose }) {
  const toast = useToast();
  const update = useUpdateFlightRequest();
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: { status: row.status, admin_notes: row.admin_notes ?? '', quoted: millimesToTnd(row.quoted_total_millimes) },
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
        <Field label="Prix proposé au client (TND)" error={errors.quoted} hint="Optionnel. Total du ou des billets proposés.">
          <input inputMode="decimal" {...register('quoted', {
            validate: (v) => v === '' || /^\d+([.,]\d{1,3})?$/.test(v.trim()) || 'Montant invalide (ex. 1850 ou 1850.500)',
          })} />
        </Field>
        <Field label="Notes internes" error={errors.admin_notes}>
          <textarea rows="4" placeholder="Ex. 3 options envoyées par WhatsApp (Tunisair direct 1 850 TND)…" {...register('admin_notes')} />
        </Field>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Annuler</Button>
          <Button type="submit" className="w-full sm:w-auto" loading={update.isPending}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}

function Info({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
      <div><dt className="text-xs text-slate-500">{label}</dt><dd className="font-medium text-slate-900">{children}</dd></div>
    </div>
  );
}

function RequestCard({ r, canManage, onTreat }) {
  const s = STATUS[r.status] ?? STATUS.pending_confirmation;
  const digits = String(r.client_phone ?? '').replace(/\D/g, '');
  const prefs = [
    r.direct_only && 'Vol direct uniquement',
    r.flexible_dates && 'Dates flexibles (± 3 jours)',
    r.preferred_airline && `Compagnie : ${r.preferred_airline}`,
  ].filter(Boolean);

  return (
    <article className={cn('rounded-xl border-l-4 bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5',
      r.status === 'pending_confirmation' ? 'border-l-amber-500' : 'border-l-slate-200')}>
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
        <Info icon={Plane} label={r.trip_type === 'return' ? 'Aller-retour' : 'Aller simple'}>{r.from_place} → {r.to_place}</Info>
        <Info icon={CalendarDays} label="Dates souhaitées">
          {fmtDayShort(r.depart_date)}{r.return_date ? ` → ${fmtDayShort(r.return_date)}` : ''}
        </Info>
        <Info icon={Users} label="Voyageurs">{travellers(r)}</Info>
        <Info icon={Luggage} label="Classe · bagages">
          {CABIN[r.cabin_class] ?? r.cabin_class} · {r.checked_bags ? plural(r.checked_bags, 'bagage') + ' en soute' : 'cabine seulement'}
        </Info>
      </dl>

      {(prefs.length > 0 || r.branch_name) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {prefs.map((p) => <span key={p} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{p}</span>)}
          {r.branch_name && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
              <Store className="size-3.5" /> {r.branch_name}
            </span>
          )}
        </div>
      )}

      {r.message && <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">« {r.message} »</p>}
      {r.admin_notes && (
        <p className="mt-3 whitespace-pre-line rounded-lg bg-amber-50/70 p-3 text-sm text-slate-800 ring-1 ring-inset ring-amber-200/60">
          <span className="block text-xs font-semibold text-amber-800">Notes internes{r.handled_by_name ? ` · ${r.handled_by_name}` : ''}</span>
          {r.admin_notes}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Button as="a" href={`tel:${r.client_phone}`} variant="secondary" size="sm" icon={Phone}>{r.client_phone}</Button>
        {digits && <Button as="a" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm" icon={MessageCircle}>WhatsApp</Button>}
        <Button as="a" href={`mailto:${r.client_email}?subject=${encodeURIComponent(`Votre demande de vol ${r.reference}`)}`}
                variant="secondary" size="sm" icon={Mail}>{r.client_email}</Button>
        {canManage && <Button size="sm" icon={Pencil} className="sm:ml-auto" onClick={() => onTreat(r)}>Traiter</Button>}
      </div>
    </article>
  );
}

export default function FlightRequestsPage() {
  const { can } = useAuth();
  const canManage = can('bookings.write');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);
  const [treating, setTreating] = useState(null);

  const stats = useFlightStats();
  const { data, isLoading, error } = flightRequests.useList({ status, q, page, limit: 10 });
  const items = data?.items ?? [];
  const s = stats.data;

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Demandes de vols"
                  description="Demandes envoyées depuis la page Vols du site (aucune réservation automatique) : proposez des vols et un prix au client." />

      <StatCards items={[
        { label: 'À traiter', value: s?.pending_confirmation, icon: Inbox, tone: s?.pending_confirmation ? 'warn' : undefined,
          active: status === 'pending_confirmation', onClick: () => update({ status: 'pending_confirmation', page: '' }) },
        { label: 'Clients contactés', value: s?.contacted, icon: PhoneCall, active: status === 'contacted', onClick: () => update({ status: 'contacted', page: '' }) },
        { label: 'Confirmées', value: s?.confirmed, icon: CheckCircle2, tone: 'ok', active: status === 'confirmed', onClick: () => update({ status: 'confirmed', page: '' }) },
        { label: 'Refusées / annulées', value: s ? s.rejected + s.cancelled : undefined, icon: XCircle,
          active: status === 'rejected', onClick: () => update({ status: 'rejected', page: '' }) },
      ]} />

      <FilterBar>
        <SearchBox value={search} onChange={setSearch} onSubmit={() => update({ q: search.trim(), page: '' })}
                   placeholder="Nom, téléphone, e-mail, référence, ville…" />
        <Segmented value={status} onChange={(v) => update({ status: v, page: '' })}
                   options={[['', 'Toutes'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])]} />
      </FilterBar>

      {error && <Alert tone="bad">{error.message}</Alert>}
      {isLoading && items.length === 0 && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-200/60" />)}</div>}
      {!isLoading && items.length === 0 && (
        <Card padded={false}><EmptyState icon={Plane} title="Aucune demande" text="Les demandes envoyées depuis la page Vols du site apparaîtront ici." /></Card>
      )}

      <div className="space-y-3">
        {items.map((r) => <RequestCard key={r.id} r={r} canManage={canManage} onTreat={setTreating} />)}
      </div>

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 10} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />

      {treating && <TreatModal key={treating.id} row={treating} onClose={() => setTreating(null)} />}
    </>
  );
}
