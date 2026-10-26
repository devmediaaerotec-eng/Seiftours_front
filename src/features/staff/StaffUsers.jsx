import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KeyRound, Pencil, Plus, Power } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import SecretModal from '@/components/ui/SecretModal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import StatCards from '@/features/fleet/shared/StatCards';
import { fmtDateTime, timeAgo } from '@/lib/format';
import StaffForm from './StaffForm';
import { staff, useResetPassword, useStaffOptions, useStaffStats } from './resource';

export default function StaffUsers() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const role = params.get('role') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);
  const [editing, setEditing] = useState(undefined);
  const [secret, setSecret] = useState(null);

  const stats = useStaffStats();
  const options = useStaffOptions();
  const { data, isLoading, error } = staff.useList({ status, role, q, page, limit: 20 });
  const flags = staff.useFlags();
  const reset = useResetPassword();

  const onError = (e) => toast.error(e.data?.violations ? Object.values(e.data.violations)[0] : e.message);
  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const toggle = (u) => {
    if (u.is_active && !window.confirm(`Désactiver le compte de ${u.full_name} ? Cette personne ne pourra plus se connecter.`)) return;
    flags.mutate({ id: u.id, is_active: !u.is_active }, {
      onSuccess: () => toast.success(u.is_active ? 'Compte désactivé.' : 'Compte réactivé.'), onError,
    });
  };

  const resetPwd = (u) => {
    if (!window.confirm(`Générer un nouveau mot de passe provisoire pour ${u.full_name} ? L'ancien ne fonctionnera plus.`)) return;
    reset.mutate(u.id, {
      onSuccess: (r) => setSecret({ title: 'Nouveau mot de passe', name: u.full_name, email: u.email, password: r.temp_password }),
      onError,
    });
  };

  const s = stats.data;

  return (
    <>
      <div className="row-tools" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn" onClick={() => setEditing(null)}><Plus size={16} /> Nouveau compte</button>
      </div>

      <StatCards items={[
        { label: 'Comptes actifs', value: s?.active, active: status === '', onClick: () => update({ status: '', page: '' }) },
        { label: 'Désactivés', value: s?.inactive, active: status === 'inactive', onClick: () => update({ status: 'inactive', page: '' }) },
        { label: 'Jamais connectés', value: s?.never, tone: s?.never ? 'warn' : '' },
      ]} />

      <div className="filters wrap">
        <form onSubmit={(e) => { e.preventDefault(); update({ q: search.trim(), page: '' }); }}>
          <input placeholder="Nom, e-mail, téléphone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn">Rechercher</button>
        </form>
        <select value={role} onChange={(e) => update({ role: e.target.value, page: '' })}>
          <option value="">Tous les rôles</option>
          {(options.data?.roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <select value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
          <option value="">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="inactive">Désactivés</option>
        </select>
      </div>

      {error && <div className="alert bad">{error.message}</div>}

      <div className="card">
        <table>
          <thead><tr><th>Personne</th><th>Rôle</th><th>Agence</th><th>Dernière connexion</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {(data?.items ?? []).map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="person">
                    <Avatar name={u.full_name} size={38} />
                    <div><strong>{u.full_name}</strong>{u.id === me.id && <> <span className="badge teal">Vous</span></>}<br />
                      <small className="muted">{u.email}{u.phone ? ` · ${u.phone}` : ''}</small></div>
                  </div>
                </td>
                <td><span className="badge info">{u.role_label}</span></td>
                <td>{u.branch_name || <span className="muted">Toutes</span>}</td>
                <td>{u.last_login_at ? <span title={fmtDateTime(u.last_login_at)}>{timeAgo(u.last_login_at)}</span> : <span className="muted">Jamais</span>}</td>
                <td><span className={`badge ${u.is_active ? 'ok' : 'muted'}`}>{u.is_active ? 'Actif' : 'Désactivé'}</span></td>
                <td>
                  <div className="table-actions">
                    <button className="btn ghost sm" onClick={() => setEditing(u)}><Pencil size={14} /> Modifier</button>
                    {u.id !== me.id && (
                      <>
                        <button className="btn ghost sm" title="Nouveau mot de passe provisoire" onClick={() => resetPwd(u)}><KeyRound size={14} /></button>
                        <button className="btn ghost sm" title={u.is_active ? 'Désactiver' : 'Réactiver'} onClick={() => toggle(u)}><Power size={14} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {isLoading && <tr><td colSpan="6" className="muted">Chargement…</td></tr>}
            {!isLoading && (data?.items ?? []).length === 0 && <tr><td colSpan="6" className="muted">Aucun compte.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 20} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />

      {editing !== undefined && (
        <Modal title={editing ? `Modifier ${editing.full_name}` : 'Nouveau compte'} onClose={() => setEditing(undefined)}>
          <StaffForm key={editing?.id ?? 'new'} row={editing} isMe={editing?.id === me.id}
                     onCancel={() => setEditing(undefined)}
                     onDone={(res) => {
                       const created = !editing;
                       setEditing(undefined);
                       if (created && res?.temp_password) {
                         setSecret({ title: 'Compte créé', name: res.user.full_name, email: res.user.email, password: res.temp_password });
                       }
                     }} />
        </Modal>
      )}

      {secret && (
        <SecretModal
          title={secret.title}
          intro={`Communiquez ces identifiants à ${secret.name}. Le mot de passe ne sera plus affiché après la fermeture de cette fenêtre. La personne peut le changer en cliquant sur son nom en haut à droite.`}
          rows={[['Identifiant', secret.email]]}
          secret={secret.password}
          onClose={() => setSecret(null)}
        />
      )}
    </>
  );
}