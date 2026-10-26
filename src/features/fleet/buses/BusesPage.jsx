import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { assetUrl } from '@/lib/format';
import DocBadge from '../shared/DocBadge';
import StatCards from '../shared/StatCards';
import { BUS_STATUS, BUS_TYPE } from '../shared/status';
import BusForm from './BusForm';
import { buses, useBusStats, useBusStatus } from './resource';

export default function BusesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { can } = useAuth();
  const canWrite = can('fleet.manage');

  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const type = params.get('type') || '';
  const docs = params.get('docs') || '';
  const archived = params.get('archived') === '1';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);
  const [editing, setEditing] = useState(undefined);   // undefined = fermé, null = nouveau

  const stats = useBusStats();
  const { data, isLoading, error } = buses.useList({ status, type, docs, q, page, limit: 20, archived: archived ? '1' : '' });
  const flags = buses.useFlags();
  const remove = buses.useRemove();
  const setStatus = useBusStatus();

  const onError = (e) => toast.error(e.message);
  const refreshDrivers = () => qc.invalidateQueries({ queryKey: ['drivers'] });
  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };
  const filterBy = (patch) => update({ status: '', type: '', docs: '', archived: '', page: '', ...patch });

  const del = (b) => {
    if (!window.confirm(`Supprimer le bus ${b.code} ?`)) return;
    remove.mutate(b.id, { onSuccess: () => { toast.success('Supprimé.'); refreshDrivers(); }, onError });
  };

  const s = stats.data;

  return (
    <>
      <PageHeader title="Bus" action={canWrite && (
        <button className="btn" onClick={() => setEditing(null)}><Plus size={16} /> Nouveau bus</button>
      )} />

      <StatCards items={[
        { label: 'Bus actifs', value: s?.total, active: !status && !docs && !type && !archived, onClick: () => filterBy({}) },
        { label: 'Disponibles', value: s?.available, active: status === 'available', onClick: () => filterBy({ status: 'available' }) },
        { label: 'En mission', value: s?.on_mission, active: status === 'on_mission', onClick: () => filterBy({ status: 'on_mission' }) },
        { label: 'Maintenance / hors service', value: (s?.maintenance ?? 0) + (s?.out_of_service ?? 0), active: status === 'maintenance', onClick: () => filterBy({ status: 'maintenance' }) },
        { label: 'Documents à renouveler', value: s?.docs, tone: s?.docs ? 'warn' : '', active: docs === 'expiring', onClick: () => filterBy({ docs: 'expiring' }) },
      ]} />

      <div className="filters">
        <form onSubmit={(e) => { e.preventDefault(); update({ q: search.trim(), page: '' }); }}>
          <input placeholder="Code, immatriculation, marque, chauffeur…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn">Rechercher</button>
        </form>
        <select value={type} onChange={(e) => update({ type: e.target.value, page: '' })}>
          <option value="">Tous les types</option>
          <option value="minibus">Minibus ({s?.minibus ?? 0})</option>
          <option value="microbus">Microbus ({s?.microbus ?? 0})</option>
        </select>
        <select value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
          <option value="">Tous les statuts</option>
          {Object.entries(BUS_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
            <tr><th>Bus</th><th>Véhicule</th><th>Chauffeur attitré</th><th>Statut</th><th>Documents</th><th /></tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((b) => (
              <tr key={b.id}>
                <td>
                  <div className="person">
                    {b.image_url ? <img className="thumb" src={assetUrl(b.image_url)} alt="" /> : <div className="thumb" />}
                    <div>
                      <strong>{b.code}</strong><br />
                      <small className="muted">{b.plate_number}</small>
                      {b.gps_device_id && <><br /><small className="muted">GPS : {b.gps_device_id}</small></>}
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${BUS_TYPE[b.bus_type]?.cls}`}>{BUS_TYPE[b.bus_type]?.label}</span><br />
                  {[b.brand, b.model].filter(Boolean).join(' ') || '—'}<br />
                  <small className="muted">{b.seats} places{b.year_made ? ` · ${b.year_made}` : ''}</small>
                </td>
                <td>
                  {b.driver_name
                    ? <div className="person"><Avatar src={b.driver_photo} name={b.driver_name} size={32} /><span>{b.driver_name}</span></div>
                    : <span className="muted">Aucun</span>}
                </td>
                <td>
                  {canWrite && !archived ? (
                    <select className="sm" value={b.status} disabled={b.status === 'on_mission'}
                            onChange={(e) => setStatus.mutate({ id: b.id, status: e.target.value }, { onSuccess: () => toast.success('Statut mis à jour.'), onError })}>
                      {Object.entries(BUS_STATUS)
                        .filter(([k]) => k !== 'on_mission' || b.status === 'on_mission')
                        .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  ) : (
                    <span className={`badge ${BUS_STATUS[b.status]?.cls}`}>{BUS_STATUS[b.status]?.label}</span>
                  )}
                </td>
                <td>
                  <DocBadge label="Assurance" date={b.insurance_expires_on} doc={b.insurance} />
                  <DocBadge label="Visite technique" date={b.inspection_expires_on} doc={b.inspection} />
                </td>
                <td>
                  {canWrite && (
                    <div className="table-actions">
                      <button className="btn ghost sm" onClick={() => setEditing(b)}><Pencil size={14} /> Modifier</button>
                      <button className="btn ghost sm" title={b.is_active ? 'Archiver (libère le chauffeur)' : 'Restaurer'}
                              onClick={() => flags.mutate({ id: b.id, is_active: !b.is_active }, {
                                onSuccess: () => { toast.success(b.is_active ? 'Archivé.' : 'Restauré.'); refreshDrivers(); },
                                onError,
                              })}>
                        {b.is_active ? <Archive size={14} /> : <ArchiveRestore size={14} />}
                      </button>
                      <button className="btn ghost sm" onClick={() => del(b)} aria-label="Supprimer"><Trash2 size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {isLoading && <tr><td colSpan="6" className="muted">Chargement…</td></tr>}
            {!isLoading && (data?.items ?? []).length === 0 && <tr><td colSpan="6" className="muted">Aucun bus.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 20} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />

      {editing !== undefined && (
        <Modal title={editing ? `Modifier ${editing.code}` : 'Nouveau bus'} onClose={() => setEditing(undefined)}>
          <BusForm key={editing?.id ?? 'new'} row={editing}
                   onDone={() => { setEditing(undefined); refreshDrivers(); }} onCancel={() => setEditing(undefined)} />
        </Modal>
      )}
    </>
  );
}