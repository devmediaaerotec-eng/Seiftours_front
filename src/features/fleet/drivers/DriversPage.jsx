import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Copy, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import DocBadge from '../shared/DocBadge';
import StatCards from '../shared/StatCards';
import { BUS_TYPE, DRIVER_STATUS } from '../shared/status';
import DriverForm from './DriverForm';
import { drivers, useDriverStats, useDriverStatus, useResetPin } from './resource';

export default function DriversPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { can } = useAuth();
  const canWrite = can('fleet.manage');

  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const bus = params.get('bus') || '';
  const docs = params.get('docs') || '';
  const archived = params.get('archived') === '1';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);
  const [editing, setEditing] = useState(undefined);
  const [pinInfo, setPinInfo] = useState(null);        // { name, pin }

  const stats = useDriverStats();
  const { data, isLoading, error } = drivers.useList({ status, bus, docs, q, page, limit: 20, archived: archived ? '1' : '' });
  const flags = drivers.useFlags();
  const remove = drivers.useRemove();
  const setStatus = useDriverStatus();
  const resetPin = useResetPin();

  const onError = (e) => toast.error(e.message);
  const refreshBuses = () => qc.invalidateQueries({ queryKey: ['buses'] });
  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };
  const filterBy = (patch) => update({ status: '', bus: '', docs: '', archived: '', page: '', ...patch });

  const del = (d) => {
    if (!window.confirm(`Supprimer ${d.full_name} ?`)) return;
    remove.mutate(d.id, { onSuccess: () => { toast.success('Supprimé.'); refreshBuses(); }, onError });
  };

  const reset = (d) => {
    const msg = d.has_pin
      ? `Générer un nouveau code PIN pour ${d.full_name} ? L'ancien code ne fonctionnera plus.`
      : `Générer un code PIN pour ${d.full_name} ?`;
    if (!window.confirm(msg)) return;
    resetPin.mutate(d.id, { onSuccess: (r) => setPinInfo({ name: d.full_name, pin: r.pin }), onError });
  };

  const copyPin = async () => {
    try { await navigator.clipboard.writeText(pinInfo.pin); toast.success('Code copié.'); }
    catch { toast.error('Copie impossible : recopiez le code à la main.'); }
  };

  const s = stats.data;

  return (
    <>
      <PageHeader title="Chauffeurs" action={canWrite && (
        <button className="btn" onClick={() => setEditing(null)}><Plus size={16} /> Nouveau chauffeur</button>
      )} />

      <StatCards items={[
        { label: 'Chauffeurs actifs', value: s?.total, active: !status && !docs && !bus && !archived, onClick: () => filterBy({}) },
        { label: 'En service', value: s?.active, active: status === 'active', onClick: () => filterBy({ status: 'active' }) },
        { label: 'En congé', value: s?.on_leave, active: status === 'on_leave', onClick: () => filterBy({ status: 'on_leave' }) },
        { label: 'Sans bus attribué', value: s?.without_bus, tone: s?.without_bus ? 'warn' : '', active: bus === 'none', onClick: () => filterBy({ bus: 'none' }) },
        { label: 'Permis à renouveler', value: s?.docs, tone: s?.docs ? 'warn' : '', active: docs === 'expiring', onClick: () => filterBy({ docs: 'expiring' }) },
      ]} />

      <div className="filters">
        <form onSubmit={(e) => { e.preventDefault(); update({ q: search.trim(), page: '' }); }}>
          <input placeholder="Nom, téléphone, permis, bus…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn">Rechercher</button>
        </form>
        <select value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
          <option value="">Tous les statuts</option>
          {Object.entries(DRIVER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <label className="chk" style={{ margin: 0, whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={archived} onChange={(e) => update({ archived: e.target.checked ? '1' : '', page: '' })} />
          Archivés
        </label>
      </div>

      {error && <div className="alert bad">{error.message}</div>}

      <div className="card">
        <table>
          <thead>
            <tr><th>Chauffeur</th><th>Téléphone</th><th>Bus attribué</th><th>Permis</th><th>Statut</th><th>Application</th><th /></tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((d) => (
              <tr key={d.id}>
                <td>
                  <div className="person">
                    <Avatar src={d.photo_url} name={d.full_name} size={44} />
                    <div><strong>{d.full_name}</strong>{d.email && <><br /><small className="muted">{d.email}</small></>}</div>
                  </div>
                </td>
                <td><a href={`tel:${d.phone}`}>{d.phone}</a></td>
                <td>
                  {d.assigned_bus_id ? (
                    <>
                      <strong>{d.bus_code}</strong> <span className={`badge ${BUS_TYPE[d.bus_type]?.cls}`}>{BUS_TYPE[d.bus_type]?.label}</span><br />
                      <small className="muted">{d.bus_plate}</small>
                    </>
                  ) : <span className="muted">Aucun</span>}
                </td>
                <td>
                  <small className="muted">{d.license_number}</small>
                  <DocBadge label="Validité" date={d.license_expires_on} doc={d.license} />
                </td>
                <td>
                  {canWrite && !archived ? (
                    <select className="sm" value={d.status}
                            onChange={(e) => setStatus.mutate({ id: d.id, status: e.target.value }, { onSuccess: () => toast.success('Statut mis à jour.'), onError })}>
                      {Object.entries(DRIVER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  ) : (
                    <span className={`badge ${DRIVER_STATUS[d.status]?.cls}`}>{DRIVER_STATUS[d.status]?.label}</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${d.has_pin ? 'ok' : 'muted'}`}>{d.has_pin ? 'Accès créé' : "Pas d'accès"}</span>
                  {canWrite && (
                    <><br /><button className="btn ghost sm" style={{ marginTop: 6 }} onClick={() => reset(d)}>
                      <KeyRound size={14} /> {d.has_pin ? 'Nouveau PIN' : 'Créer un PIN'}
                    </button></>
                  )}
                </td>
                <td>
                  {canWrite && (
                    <div className="table-actions">
                      <button className="btn ghost sm" onClick={() => setEditing(d)}><Pencil size={14} /> Modifier</button>
                      <button className="btn ghost sm" title={d.is_active ? 'Archiver (libère le bus)' : 'Restaurer'}
                              onClick={() => flags.mutate({ id: d.id, is_active: !d.is_active }, {
                                onSuccess: () => { toast.success(d.is_active ? 'Archivé.' : 'Restauré.'); refreshBuses(); },
                                onError,
                              })}>
                        {d.is_active ? <Archive size={14} /> : <ArchiveRestore size={14} />}
                      </button>
                      <button className="btn ghost sm" onClick={() => del(d)} aria-label="Supprimer"><Trash2 size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {isLoading && <tr><td colSpan="7" className="muted">Chargement…</td></tr>}
            {!isLoading && (data?.items ?? []).length === 0 && <tr><td colSpan="7" className="muted">Aucun chauffeur.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 20} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />

      {editing !== undefined && (
        <Modal title={editing ? `Modifier ${editing.full_name}` : 'Nouveau chauffeur'} onClose={() => setEditing(undefined)}>
          <DriverForm key={editing?.id ?? 'new'} row={editing} onDone={() => setEditing(undefined)} onCancel={() => setEditing(undefined)} />
        </Modal>
      )}

      {pinInfo && (
        <Modal title="Code PIN généré" onClose={() => setPinInfo(null)}>
          <p>Communiquez ce code à <strong>{pinInfo.name}</strong>. Il ne sera <strong>plus affiché</strong> après la fermeture de cette fenêtre.</p>
          <div className="pin-box">{pinInfo.pin}</div>
          <div className="modal-actions">
            <button className="btn ghost" onClick={copyPin}><Copy size={16} /> Copier</button>
            <button className="btn" onClick={() => setPinInfo(null)}>Fermer</button>
          </div>
        </Modal>
      )}
    </>
  );
}