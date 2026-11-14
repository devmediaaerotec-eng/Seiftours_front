import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Archive, Copy, MailPlus, MessageCircle, Pencil, Plus, RotateCcw } from 'lucide-react';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { waLink } from '../fleet/shared/liveState';
import {
  useClients, useCreateClient, useDeleteClient, useInviteClient,
  useRestoreClient, useRevokeInvite, useUpdateClient,
} from '../fleet/missions/resource';

const INVITE = {
  none:     { label: 'Pas d\'accès', cls: 'muted' },
  pending:  { label: 'Invitation en attente', cls: 'warn' },
  accepted: { label: 'Accès actif', cls: 'ok' },
};

/* ---------------------------------------------------------- formulaire */

function ClientForm({ client, onClose }) {
  const toast = useToast();
  const create = useCreateClient();
  const update = useUpdateClient();
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: {
      name: client?.name ?? '', contact_name: client?.contact_name ?? '', phone: client?.phone ?? '',
      email: client?.email ?? '', address: client?.address ?? '', notes: client?.notes ?? '',
    },
  });
  const busy = create.isPending || update.isPending;

  const submit = handleSubmit(async (v) => {
    try {
      if (client) await update.mutateAsync({ id: client.id, ...v });
      else await create.mutateAsync(v);
      toast.success(client ? 'Client modifié.' : 'Client créé.');
      onClose();
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        Object.entries(e.data.violations).forEach(([k, msg]) => setError(k, { type: 'server', message: msg }));
      } else toast.error(e.message);
    }
  });

  return (
    <Modal title={client ? 'Modifier le client' : 'Nouveau client'} size="lg" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Nom du client *" error={errors.name}>
            <input autoFocus {...register('name', { required: 'Champ requis', minLength: { value: 2, message: '2 caractères minimum' } })} />
          </Field>
          <Field label="Personne de contact" error={errors.contact_name}><input {...register('contact_name')} /></Field>
          <Field label="Téléphone" error={errors.phone} hint="Utilisé pour WhatsApp.">
            <input inputMode="tel" {...register('phone', { validate: (v) => v === '' || /^[+0-9 ().-]{6,30}$/.test(v) || 'Numéro invalide' })} />
          </Field>
          <Field label="Email" error={errors.email} hint="Nécessaire pour l'invitation.">
            <input type="email" {...register('email')} />
          </Field>
          <Field label="Adresse" className="span-2" error={errors.address}><input {...register('address')} /></Field>
          <Field label="Notes internes" className="span-2" error={errors.notes}><textarea rows="3" {...register('notes')} /></Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------- invitation */

function InviteModal({ client, onClose }) {
  const toast = useToast();
  const invite = useInviteClient();
  const revoke = useRevokeInvite();
  const [email, setEmail] = useState(client.email ?? '');
  const [link, setLink] = useState('');

  const generate = async () => {
    try {
      const res = await invite.mutateAsync({ id: client.id, email: email.trim() });
      setLink(`${window.location.origin}/invite/${res.token}`);
    } catch (e) {
      toast.error(e.data?.violations ? Object.values(e.data.violations)[0] : e.message);
    }
  };

  const message = `Bonjour${client.contact_name ? ` ${client.contact_name}` : ''},\n`
    + `Seif Tours vous invite à créer votre espace client pour suivre vos missions :\n${link}\n\n`
    + 'Ce lien est valable 7 jours.';

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast.success('Lien copié.'); }
    catch { toast.error('Copie impossible : sélectionnez le lien à la main.'); }
  };

  return (
    <Modal title={`Inviter ${client.name}`} onClose={onClose}>
      {!link ? (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            Un lien personnel et temporaire (7 jours) sera créé. Une ancienne invitation en attente sera annulée.
          </p>
          <Field label="Email du client *">
            <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="modal-actions">
            {client.invite_state === 'pending' && (
              <button type="button" className="btn ghost" style={{ marginRight: 'auto' }} disabled={revoke.isPending}
                      onClick={() => revoke.mutate(client.id, { onSuccess: () => { toast.success('Invitation annulée.'); onClose(); } })}>
                Annuler l'invitation en cours
              </button>
            )}
            <button type="button" className="btn ghost" onClick={onClose}>Fermer</button>
            <button type="button" className="btn" disabled={invite.isPending || !email.includes('@')} onClick={generate}>
              <MailPlus size={16} /> Générer le lien
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="alert ok">Lien créé. Il ne sera plus affichable après fermeture : envoyez-le maintenant.</div>
          <pre className="prog-msg" style={{ marginTop: 12 }}>{link}</pre>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Fermer</button>
            <button type="button" className="btn ghost" onClick={copy}><Copy size={16} /> Copier</button>
            <a className="btn ghost" href={`mailto:${email}?subject=${encodeURIComponent('Votre espace client Seif Tours')}&body=${encodeURIComponent(message)}`}>
              <MailPlus size={16} /> Email
            </a>
            {client.phone && (
              <a className="btn" target="_blank" rel="noopener noreferrer" href={waLink(client.phone, message)}>
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

/* --------------------------------------------------------------- page */

export default function ClientsPage() {
  const toast = useToast();
  const { can } = useAuth();
  const canManage = can('missions.manage');
  const [showArchived, setShowArchived] = useState(false);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // { type: 'form' | 'invite', client? }

  const { data, isLoading, error } = useClients(showArchived);
  const del = useDeleteClient();
  const restore = useRestoreClient();

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.items ?? []).filter((c) => !s
      || [c.name, c.contact_name, c.phone, c.email].some((x) => (x ?? '').toLowerCase().includes(s)));
  }, [data, q]);

  const archive = (c) => {
    const msg = c.missions_count
      ? `« ${c.name} » a ${c.missions_count} ligne(s) de mission : il sera archivé (l'historique est conservé). Continuer ?`
      : `Supprimer « ${c.name} » ?`;
    if (!window.confirm(msg)) return;
    del.mutate(c.id, {
      onSuccess: (r) => toast.success(r.archived ? 'Client archivé.' : 'Client supprimé.'),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <>
      <PageHeader title="Clients" action={canManage && (
        <button className="btn" onClick={() => setModal({ type: 'form' })}><Plus size={16} /> Nouveau client</button>
      )} />

      <div className="filters wrap">
        <input placeholder="Nom, contact, téléphone, email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="chk" style={{ margin: 0, whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Afficher les archivés
        </label>
      </div>

      {error && <div className="alert bad">{error.message}</div>}

      <div className="card">
        <table>
          <thead>
            <tr><th>Client</th><th>Contact</th><th>Missions</th><th>Espace client</th><th /></tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const inv = INVITE[c.invite_state] ?? INVITE.none;
              return (
                <tr key={c.id} style={c.is_active ? undefined : { opacity: 0.55 }}>
                  <td>
                    <strong>{c.name}</strong>{!c.is_active && <> <span className="badge muted">Archivé</span></>}
                    {c.contact_name && <><br /><small className="muted">{c.contact_name}</small></>}
                  </td>
                  <td>
                    {c.phone || '—'}
                    {c.email && <><br /><small className="muted">{c.email}</small></>}
                  </td>
                  <td>{c.missions_count}</td>
                  <td><span className={`badge ${inv.cls}`}>{inv.label}</span></td>
                  <td>
                    {canManage && (
                      <div className="table-actions">
                        {c.is_active ? (
                          <>
                            {c.invite_state !== 'accepted' && (
                              <button className="btn ghost sm" onClick={() => setModal({ type: 'invite', client: c })}>
                                <MailPlus size={14} /> Inviter
                              </button>
                            )}
                            <button className="btn ghost sm" onClick={() => setModal({ type: 'form', client: c })}><Pencil size={14} /> Modifier</button>
                            <button className="btn ghost sm" disabled={del.isPending} onClick={() => archive(c)}><Archive size={14} /></button>
                          </>
                        ) : (
                          <button className="btn ghost sm" disabled={restore.isPending}
                                  onClick={() => restore.mutate(c.id, { onSuccess: () => toast.success('Client restauré.') })}>
                            <RotateCcw size={14} /> Restaurer
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {isLoading && <tr><td colSpan="5" className="muted">Chargement…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan="5" className="muted">Aucun client.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal?.type === 'form' && <ClientForm client={modal.client} onClose={() => setModal(null)} />}
      {modal?.type === 'invite' && <InviteModal client={modal.client} onClose={() => setModal(null)} />}
    </>
  );
}