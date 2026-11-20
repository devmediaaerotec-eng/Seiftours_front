import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Ban, Banknote, BedDouble, CalendarDays, CheckCircle2, ClipboardCheck, Copy, CreditCard,
  History as HistoryIcon, Hotel, Hourglass, Info, Landmark, Mail, MessageCircle, Moon, Pencil, Phone, PhoneCall, Receipt, Send,
  StickyNote, UserRound, Users, Utensils, Wallet, XCircle,
} from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, Panel } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { api } from '@/lib/http';
import { STATUS, fmtDate, fmtDateTime, money, timeAgo } from '@/lib/format';
import { bookings } from '../resource';

/* ---------------------------------------------------------------- libellés */

const MODE = { request: 'Demande de réservation', agency: 'Devis agence', deposit: 'Acompte en ligne' };
const SOURCE = { website: 'Site web', agency_walkin: "Visite en agence", phone: 'Téléphone', other: 'Autre' };
const KIND = { deposit: 'Acompte', balance: 'Solde', full: 'Paiement total' };
const PROVIDER = {
  clictopay: ['ClicToPay', CreditCard], cash_agency: ['Espèces en agence', Banknote], bank_transfer: ['Virement', Landmark],
  card_terminal: ['Terminal de paiement', CreditCard], other: ['Autre', Wallet],
};
const PAY_STATUS = {
  initiated: ['Initié', 'muted'], pending: ['En attente', 'warn'], succeeded: ['Réussi', 'ok'], failed: ['Échoué', 'bad'], cancelled: ['Annulé', 'muted'],
};
const DOT = {
  ok: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-red-500', info: 'bg-sky-500', teal: 'bg-brand-500', gold: 'bg-gold-500', muted: 'bg-slate-400',
};

const FLOWS = {
  request: [['pending_confirmation', 'Demande reçue', Hourglass], ['contacted', 'Client contacté', PhoneCall], ['confirmed', 'Confirmée', CheckCircle2]],
  agency: [['pending_agency', 'Demande reçue', Hourglass], ['confirmed', 'Confirmée', CheckCircle2]],
  deposit: [['awaiting_payment', 'Paiement', CreditCard], ['paid', 'Payée', Wallet], ['confirming', 'Hôtel', Hotel], ['confirmed', 'Confirmée', CheckCircle2]],
};
const NEGATIVE = { cancelled: 'Annulée', expired: 'Expirée', failed: 'Échec', payment_failed: 'Paiement échoué', rejected: 'Refusée' };

const HINTS = {
  pending_confirmation: ['info', 'Demande à traiter', "Vérifiez la disponibilité et le prix final auprès de l'hôtel, puis appelez le client. Aucun paiement n'a été fait en ligne."],
  contacted: ['info', 'Client contacté', "Confirmez la réservation une fois l'accord du client obtenu (le client peut régler en agence), ou refusez-la."],
  rejected: ['info', 'Demande refusée', 'Le client a été informé que sa demande ne peut pas être satisfaite.'],
  pending_agency: ['info', 'Devis à traiter', 'Appelez le client, puis confirmez ou annulez ce dossier.'],
  awaiting_payment: ['info', 'Paiement en cours', "Le client est sur la page de paiement. Ce statut évolue tout seul."],
  paid: ['info', 'Acompte reçu', "Réservez la chambre chez le fournisseur, puis confirmez le dossier (ou marquez l'échec et remboursez)."],
  confirming: ['info', 'Réservation en cours', "Le système réserve l'hôtel chez le fournisseur."],
  confirmed: ['ok', 'Réservation confirmée', 'Suivez le séjour et encaissez le solde restant.'],
  payment_failed: ['warn', 'Paiement échoué', "Aucun montant n'a été débité. Vous pouvez rappeler le client."],
  failed: ['bad', 'Échec côté fournisseur', "Le client a payé mais l'hôtel n'a pas pu être réservé : remboursez-le ou réservez à la main."],
  cancelled: ['info', 'Réservation annulée', "Si un acompte a été payé, pensez au remboursement."],
  expired: ['info', 'Dossier expiré', 'Le délai est dépassé sans suite. Aucune action requise.'],
};

// Doit refléter les transitions autorisées côté serveur
const TRANSITIONS = {
  pending_confirmation: ['contacted', 'confirmed', 'rejected', 'cancelled'],
  contacted: ['confirmed', 'rejected', 'cancelled'],
  pending_agency: ['confirmed', 'cancelled', 'expired'],
  paid: ['confirmed', 'failed', 'cancelled'],
  confirmed: ['cancelled'],
};

const ACTIONS = {
  contacted: {
    label: 'Client contacté', variant: 'secondary', icon: PhoneCall, perm: 'bookings.write',
    title: 'Marquer le client comme contacté', confirm: 'Enregistrer',
    text: 'Indiquez ce qui a été convenu avec le client (disponibilité, prix final, passage en agence…).',
    noteLabel: 'Compte rendu (optionnel)', noteRequired: false,
  },
  rejected: {
    label: 'Refuser la demande', variant: 'danger', icon: XCircle, perm: 'bookings.write',
    title: 'Refuser la demande', confirm: 'Confirmer le refus',
    text: "La demande sera close (ex. hôtel complet, client non intéressé par le prix final). Pensez à prévenir le client.",
    noteLabel: 'Raison du refus *', noteRequired: true,
  },
  confirmed: {
    label: 'Confirmer', variant: 'primary', icon: CheckCircle2, perm: 'bookings.write',
    title: 'Confirmer la réservation', confirm: 'Confirmer',
    text: "Le dossier passera à « Confirmée ». Vérifiez que l'accord du client et l'acompte éventuel sont bien enregistrés.",
    noteLabel: 'Note interne (optionnelle)', noteRequired: false,
  },
  cancelled: {
    label: 'Annuler la réservation', variant: 'danger', icon: Ban, perm: 'bookings.cancel',
    title: 'Annuler la réservation', confirm: "Confirmer l'annulation",
    text: "Cette action clôt le dossier. Si un acompte a été payé, pensez ensuite à lancer le remboursement.",
    noteLabel: "Raison de l'annulation *", noteRequired: true,
  },
  failed: {
    label: "Échec chez l'hôtel", variant: 'danger', icon: XCircle, perm: 'bookings.write',
    title: 'Hôtel non réservé', confirm: "Confirmer l'échec",
    text: "L'hôtel n'a pas pu être réservé malgré l'acompte payé. Le client devra être remboursé.",
    noteLabel: 'Raison *', noteRequired: true,
  },
  expired: {
    label: 'Marquer expirée', variant: 'secondary', icon: Hourglass, perm: 'bookings.write',
    title: 'Marquer comme expirée', confirm: 'Marquer expirée',
    text: "Le devis sera clos sans suite (client injoignable ou sans réponse).",
    noteLabel: 'Note interne (optionnelle)', noteRequired: false,
  },
};

const parseRooms = (raw) => {
  try { const r = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(r) ? r : []; } catch { return []; }
};

/* --------------------------------------------------------------- composants */

function Stepper({ mode, status, history }) {
  const flow = FLOWS[mode] ?? FLOWS.agency;
  const negative = status in NEGATIVE;
  const reached = new Set([...history.map((h) => h.to_status), status]);
  const maxIdx = Math.max(-1, ...flow.map(([k], i) => (reached.has(k) ? i : -1)));
  const currentIdx = flow.findIndex(([k]) => k === status);

  const steps = flow.map(([key, label, Icon], i) => {
    let state = 'todo';
    if (status === 'confirmed') state = 'done';
    else if (!negative) state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'todo';
    else if (i < maxIdx) state = 'done';
    else if (i === maxIdx) state = ['pending_agency', 'pending_confirmation', 'contacted', 'confirmed'].includes(key) ? 'done' : 'stopped';
    return { key, label, Icon, state };
  });
  if (negative) steps.push({ key: status, label: NEGATIVE[status], Icon: XCircle, state: 'fail' });

  const circle = {
    done: 'bg-brand-600 text-white',
    current: 'bg-white text-brand-600 ring-2 ring-brand-500',
    stopped: 'bg-amber-100 text-amber-700 ring-2 ring-amber-400',
    fail: 'bg-red-100 text-red-600 ring-2 ring-red-300',
    todo: 'bg-slate-100 text-slate-400',
  };

  return (
    <Card className="mb-6 px-2 py-5 sm:px-8">
      <ol className="flex items-start">
        {steps.map(({ key, label, Icon, state }, i) => {
          const lit = i > 0 && steps[i - 1].state === 'done' && state !== 'todo';
          return (
            <li key={key} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && <span className={cn('absolute left-[-50%] top-[18px] h-0.5 w-full', lit ? 'bg-brand-500' : 'bg-slate-200')} />}
              <span className={cn('relative z-10 flex size-9 items-center justify-center rounded-full', circle[state])}>
                <Icon className="size-[18px]" />
              </span>
              <span className={cn('mt-2 px-1 text-[11px] leading-tight sm:text-xs',
                state === 'todo' ? 'text-slate-400' : 'font-semibold text-slate-800')}>{label}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function ActionModal({ to, pending, onClose, onSubmit }) {
  const def = ACTIONS[to];
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const Icon = def.icon;
  const danger = def.variant === 'danger';

  const submit = async (e) => {
    e.preventDefault();
    if (def.noteRequired && note.trim().length < 3) { setError('Précisez la raison (3 caractères minimum).'); return; }
    setError('');
    const err = await onSubmit(to, note.trim());
    if (err) setError(err);
  };

  return (
    <Modal title={def.title} size="sm" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="flex gap-3">
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', danger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600')}>
            <Icon className="size-5" />
          </span>
          <p className="pt-1 text-sm leading-relaxed text-slate-600">{def.text}</p>
        </div>
        <label className="mt-5 block text-sm">
          <span className="font-medium text-slate-700">{def.noteLabel}</span>
          <textarea rows="3" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Retour</Button>
          <Button type="submit" variant={def.variant} className="w-full sm:w-auto" loading={pending}>{def.confirm}</Button>
        </div>
      </form>
    </Modal>
  );
}

function NoteForm({ reference, onSaved }) {
  const toast = useToast();
  const [body, setBody] = useState('');
  const add = useMutation({
    mutationFn: (text) => api(`/admin/bookings/${reference}/notes`, { method: 'POST', body: { body: text } }),
  });

  const submit = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    try {
      await add.mutateAsync(text);
      setBody('');
      toast.success('Note ajoutée.');
      onSaved();
    } catch (err) {
      toast.error(err.status === 403 ? "Vous n'avez pas le droit d'ajouter une note." : err.message);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 border-t border-slate-100 pt-4">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Ajouter une note interne</span>
        <textarea rows="3" maxLength={2000} className="mt-1.5" value={body} onChange={(e) => setBody(e.target.value)}
                  placeholder="Ex. Client rappelé : disponibilité confirmée, passera à l'agence de Sousse samedi." />
      </label>
      <div className="mt-2 flex justify-end">
        <Button type="submit" size="sm" icon={Send} loading={add.isPending} disabled={!body.trim()}>Ajouter la note</Button>
      </div>
    </form>
  );
}

/** Prix final d'une demande : fixé par l'agence après vérification auprès de l'hôtel (le client ne peut pas le changer). */
function PriceForm({ reference, totalMillimes, onSaved }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: (body) => api(`/admin/bookings/${reference}/price`, { method: 'PATCH', body }),
  });

  const start = () => { setValue(String(totalMillimes / 1000)); setReason(''); setError(''); setOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    const total = Number(value.replace(',', '.'));
    if (!Number.isFinite(total) || total <= 0 || total > 200000) { setError('Indiquez un prix valide (en TND).'); return; }
    try {
      await save.mutateAsync({ total, reason: reason.trim() || undefined });
      toast.success('Prix mis à jour.');
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err.status === 403 ? "Vous n'avez pas le droit de modifier le prix." : err.message);
    }
  };

  if (!open) {
    return <Button size="sm" variant="secondary" icon={Pencil} className="mt-3 w-full" onClick={start}>Modifier le prix</Button>;
  }
  return (
    <form onSubmit={submit} noValidate className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Nouveau prix total (TND)</span>
        <input type="number" inputMode="decimal" min="0.001" max="200000" step="0.001" className="mt-1.5" autoFocus
               value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Motif <span className="font-normal text-slate-400">(facultatif)</span></span>
        <input type="text" maxLength={500} className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)}
               placeholder="Ex. tarif confirmé par l'hôtel" />
      </label>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
        <Button type="submit" size="sm" loading={save.isPending}>Enregistrer</Button>
      </div>
    </form>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded bg-slate-200" />
      <div className="h-24 rounded-xl bg-slate-200/70" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2"><div className="h-56 rounded-xl bg-slate-200/70" /><div className="h-40 rounded-xl bg-slate-200/70" /></div>
        <div className="space-y-6"><div className="h-48 rounded-xl bg-slate-200/70" /><div className="h-52 rounded-xl bg-slate-200/70" /></div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- page */

export default function BookingDetail() {
  const { reference } = useParams();
  const toast = useToast();
  const qc = useQueryClient();
  const { can } = useAuth();
  const [action, setAction] = useState(null);

  const { data, isLoading, error } = bookings.useOne(reference);

  const change = useMutation({
    mutationFn: ({ to, note }) => api(`/admin/bookings/${reference}/status`, { method: 'PATCH', body: { status: to, note: note || null } }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: bookings.keys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copié.'); } catch { toast.error('Copie impossible.'); }
  };

  const submitAction = async (to, note) => {
    try {
      await change.mutateAsync({ to, note });
      toast.success(`Statut mis à jour : ${STATUS[to].label}`);
      setAction(null);
      return null;
    } catch (e) {
      if (e.status === 403) return "Vous n'avez pas le droit d'effectuer cette action.";
      if (e.status === 409) return 'Changement impossible : le dossier a été modifié entre-temps. Fermez cette fenêtre et vérifiez son état.';
      return e.message;
    }
  };

  if (isLoading) return <Skeleton />;
  if (error) {
    return (
      <>
        <Link to="/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="size-4" /> Réservations
        </Link>
        <Card padded={false}>
          <EmptyState icon={Receipt} title={error.status === 404 ? 'Réservation introuvable' : 'Chargement impossible'}
                      text={error.status === 404 ? "Cette référence n'existe pas, ou elle appartient à une autre agence." : error.message}
                      action={<Button as={Link} to="/bookings" variant="secondary">Retour à la liste</Button>} />
        </Card>
      </>
    );
  }

  const { booking: b, items, payments, history, notes } = data;
  const status = STATUS[b.status];
  const hint = HINTS[b.status];
  const total = Number(b.total_millimes) || 0;
  const paid = Number(b.paid_millimes) || 0;
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const available = (TRANSITIONS[b.status] ?? []).filter((to) => can(ACTIONS[to].perm));
  const digits = String(b.phone ?? '').replace(/\D/g, '');
  const isRequest = b.mode === 'request';

  return (
    <>
      <Link to="/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> Réservations
      </Link>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{b.reference}</h1>
          <button type="button" onClick={() => copy(b.reference)} aria-label="Copier la référence"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Copy className="size-4" /></button>
          <Badge tone={status?.cls} dot>{status?.label || b.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Créée {timeAgo(b.created_at)} · {MODE[b.mode] ?? b.mode} · {SOURCE[b.source] ?? b.source}
        </p>
      </div>

      <Stepper mode={b.mode} status={b.status} history={history} />

      {hint && (
        <Alert tone={hint[0]} title={hint[1]}>
          {hint[2]}
          {b.cancellation_reason ? <span className="mt-1 block font-medium">Motif : {b.cancellation_reason}</span> : null}
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* ---------- colonne latérale : en premier sur mobile ---------- */}
        <aside className="order-1 space-y-6 lg:order-2">
          {available.length > 0 && (
            <Panel title="Actions" icon={ClipboardCheck}>
              <div className="flex flex-col gap-2">
                {available.map((to) => {
                  const a = ACTIONS[to];
                  return <Button key={to} variant={a.variant} icon={a.icon} className="w-full" onClick={() => setAction(to)}>{a.label}</Button>;
                })}
              </div>
            </Panel>
          )}

          <Panel title="Client" icon={UserRound}>
            <div className="flex items-center gap-3">
              <Avatar name={b.customer_name} size={44} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{b.customer_name}</p>
                <p className="truncate text-sm text-slate-500">{b.email}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button as="a" href={`tel:${b.phone}`} variant="secondary" size="sm" icon={Phone} className="min-w-[6.5rem] flex-1">Appeler</Button>
              {digits && (
                <Button as="a" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm"
                        icon={MessageCircle} className="min-w-[6.5rem] flex-1">WhatsApp</Button>
              )}
              <Button as="a" href={`mailto:${b.email}`} variant="secondary" size="sm" icon={Mail} className="min-w-[6.5rem] flex-1">E-mail</Button>
            </div>
            <dl className="mt-3 divide-y divide-slate-100">
              {b.customer_title && <Row label="Civilité">{b.customer_title}</Row>}
              <Row label="Téléphone">{b.phone}</Row>
              <Row label="E-mail">{b.email}</Row>
              <Row label="Agence">{b.branch_name || (isRequest ? 'Pas de préférence' : 'En ligne')}</Row>
              {b.assigned_to_name && <Row label="Suivi par">{b.assigned_to_name}</Row>}
            </dl>
          </Panel>

          <Panel title="Montants" icon={Wallet}>
            <p className="text-3xl font-semibold tracking-tight text-slate-900">{money(total)}</p>
            <p className="text-xs text-slate-500">{isRequest ? "Prix de la demande (modifiable par l'agence)" : 'Total de la réservation'}</p>
            {isRequest && b.displayed_total_millimes != null && Number(b.displayed_total_millimes) !== total && (
              <p className="mt-1 text-xs text-slate-500">Prix affiché au client lors de la demande : {money(b.displayed_total_millimes)}</p>
            )}
            {isRequest && can('bookings.write') && ['pending_confirmation', 'contacted', 'confirmed'].includes(b.status) && (
              <PriceForm key={total} reference={b.reference} totalMillimes={total}
                         onSaved={() => qc.invalidateQueries({ queryKey: bookings.keys.all })} />
            )}
            {isRequest && b.cost_millimes == null && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Prix non vérifié auprès du fournisseur au moment de la demande : contrôlez-le avant de le confirmer au client.
              </p>
            )}
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-medium text-emerald-700">Payé : {pct} %</span>
                <span className="text-slate-500">Reste : {money(b.balance_due_millimes)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <dl className="mt-3 divide-y divide-slate-100">
              <Row label="Acompte prévu">{money(b.deposit_millimes)}</Row>
              <Row label="Déjà payé">{money(paid)}</Row>
              <Row label="Reste à payer"><span className="text-base font-semibold">{money(b.balance_due_millimes)}</span></Row>
              {can('reports.read') && b.margin_millimes != null && <Row label="Marge">{money(b.margin_millimes)}</Row>}
              {b.supplier_booking_ref && (
                <Row label="Réf. fournisseur">
                  <button type="button" onClick={() => copy(b.supplier_booking_ref)} className="inline-flex items-center gap-1.5 hover:text-brand-700">
                    {b.supplier_booking_ref} <Copy className="size-3.5 text-slate-400" />
                  </button>
                </Row>
              )}
            </dl>
          </Panel>
        </aside>

        {/* ---------- colonne principale ---------- */}
        <div className="order-2 min-w-0 space-y-6 lg:order-1 lg:col-span-2">
          <Panel title="Séjour" icon={Hotel}>
            {items.length === 0 && <p className="text-sm text-slate-500">Aucun séjour enregistré.</p>}
            <div className="space-y-4">
              {items.map((it) => {
                const rooms = parseRooms(it.occupancy);
                const adults = rooms.reduce((s, r) => s + (Number(r.adults) || 0), 0);
                const children = rooms.reduce((s, r) => s + (Number(r.children) || 0), 0);
                const byRoom = (it.guests ?? []).reduce((m, g) => ((m[g.room_index] ??= []).push(g), m), {});
                return (
                  <div key={it.id} className="rounded-xl ring-1 ring-slate-200">
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{it.hotel_name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5"><BedDouble className="size-4" /> {it.room_name}</span>
                          <span className="inline-flex items-center gap-1.5"><Utensils className="size-4" /> {it.board_name || 'Sans pension'}</span>
                        </p>
                      </div>
                      <p className="whitespace-nowrap font-semibold text-slate-900">{money(it.price_millimes)}</p>
                    </div>

                    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl bg-slate-100 text-sm sm:grid-cols-4">
                      {[
                        [CalendarDays, 'Arrivée', fmtDate(it.check_in)],
                        [CalendarDays, 'Départ', fmtDate(it.check_out)],
                        [Moon, 'Durée', `${it.nights} nuit${it.nights > 1 ? 's' : ''}`],
                        [Users, 'Voyageurs', `${adults} adulte${adults > 1 ? 's' : ''}${children ? `, ${children} enfant${children > 1 ? 's' : ''}` : ''}`],
                      ].map(([Icon, label, value]) => (
                        <div key={label} className="bg-slate-50 px-4 py-3">
                          <dt className="flex items-center gap-1.5 text-xs text-slate-500"><Icon className="size-3.5" /> {label}</dt>
                          <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    {Object.keys(byRoom).length > 0 && (
                      <div className="space-y-2 border-t border-slate-100 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Noms des voyageurs</p>
                        {Object.entries(byRoom).map(([room, guests]) => (
                          <div key={room} className="text-sm">
                            <span className="font-medium text-slate-700">Chambre {Number(room) + 1} :</span>{' '}
                            <span className="text-slate-600">
                              {guests.map((g) => `${g.title ? `${g.title} ` : ''}${g.first_name} ${g.last_name}${g.is_child ? ` (enfant, ${g.age} ans)` : ''}`).join(' · ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          {b.customer_notes && (
            <Panel title="Remarques du client" icon={StickyNote}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{b.customer_notes}</p>
            </Panel>
          )}

          <Panel title="Paiements" icon={CreditCard}>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500">
                {isRequest ? "Aucun paiement en ligne : le client règle directement à l'agence après confirmation." : 'Aucun paiement enregistré.'}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const [pLabel, PIcon] = PROVIDER[p.provider] ?? PROVIDER.other;
                  const [sLabel, sTone] = PAY_STATUS[p.status] ?? [p.status, 'muted'];
                  return (
                    <li key={p.id} className="flex items-center gap-3 py-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><PIcon className="size-5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{KIND[p.kind] ?? p.kind} · {pLabel}</p>
                        <p className="truncate text-xs text-slate-500">
                          {p.paid_at ? fmtDateTime(p.paid_at) : 'Non encaissé'}{p.receipt_number ? ` · Reçu ${p.receipt_number}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-slate-900">{money(p.amount_millimes)}</span>
                        <Badge tone={sTone}>{sLabel}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Historique" icon={HistoryIcon}>
            <ol className="relative space-y-5 border-l border-slate-200 pl-6">
              {[...history].reverse().map((h, i) => (
                <li key={i} className="relative">
                  <span className={cn('absolute -left-[31px] top-1 size-3 rounded-full ring-4 ring-white', DOT[STATUS[h.to_status]?.cls] ?? 'bg-slate-400')} />
                  <p className="text-sm font-medium text-slate-900">
                    {h.from_status ? <span className="font-normal text-slate-500">{STATUS[h.from_status]?.label} → </span> : null}
                    {STATUS[h.to_status]?.label || h.to_status}
                  </p>
                  <p className="text-xs text-slate-500">{fmtDateTime(h.created_at)} · {h.changed_by || 'Système'}</p>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Notes internes" icon={StickyNote}>
            {notes.length === 0 ? <p className="text-sm text-slate-500">Aucune note.</p> : (
              <ul className="space-y-3">
                {notes.map((n, i) => (
                  <li key={i} className="rounded-lg bg-amber-50/60 p-3 ring-1 ring-inset ring-amber-200/60">
                    <p className="whitespace-pre-line text-sm text-slate-800">{n.body}</p>
                    <p className="mt-1.5 text-xs text-slate-500">{n.author} · {fmtDateTime(n.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
            {can('bookings.write') && (
              <NoteForm reference={b.reference} onSaved={() => qc.invalidateQueries({ queryKey: bookings.keys.all })} />
            )}
          </Panel>
        </div>
      </div>

      {action && <ActionModal to={action} pending={change.isPending} onClose={() => setAction(null)} onSubmit={submitAction} />}
    </>
  );
}