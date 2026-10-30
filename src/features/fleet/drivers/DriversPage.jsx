import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Archive, ArchiveRestore, Bus, CalendarOff, CreditCard, FileWarning, KeyRound, Pencil, Phone, Plus, Trash2,
  TriangleAlert, UserCheck, UserX, Users,
} from 'lucide-react';
import ActionMenu from '@/components/ui/ActionMenu';
import Alert from '@/components/ui/Alert';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import DataTable from '@/components/ui/DataTable';
import { FilterBar, SearchBox } from '@/components/ui/Filters';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import SecretModal from '@/components/ui/SecretModal';
import Switch from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { errText } from '@/lib/errors';
import { BusTypeBadge, DriverStatusBadge } from '../shared/badges';
import DocBadge from '../shared/DocBadge';
import Plate from '../shared/Plate';
import StatCards from '../shared/StatCards';
import { DRIVER_STATUS } from '../shared/status';
import DriverCard from './DriverCard';
import DriverForm from './DriverForm';
import { drivers, useDriverStats, useDriverStatus, useResetPin } from './resource';

const STATUS_ACTION = {
  active: ['Remettre en service', UserCheck],
  on_leave: ['Mettre en congé', CalendarOff],
  suspended: ['Suspendre', UserX],
};

export default function DriversPage() {
  const toast = useToast();
  const confirm = useConfirm();
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
  const [editing, setEditing] = useState(undefined);   // undefined = fermé, null = nouveau
  const [pinInfo, setPinInfo] = useState(null);        // { name, pin }

  const stats = useDriverStats();
  const { data, isLoading, error } = drivers.useList({ status, bus, docs, q, page, limit: 20, archived: archived ? '1' : '' });
  const flags = drivers.useFlags();
  const remove = drivers.useRemove();
  const setStatus = useDriverStatus();
  const resetPin = useResetPin();

  const onError = (e) => toast.error(errText(e));
  const refreshBuses = () => qc.invalidateQueries({ queryKey: ['buses'] });
  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };
  const filterBy = (patch) => update({ status: '', bus: '', docs: '', archived: '', page: '', ...patch });

  const changeStatus = (d, to) =>
    setStatus.mutate({ id: d.id, status: to }, {
      onSuccess: () => toast.success(`${d.full_name} : ${DRIVER_STATUS[to].label}.`), onError,
    });

  const toggleArchive = async (d) => {
    if (d.is_active && !(await confirm({
      title: 'Archiver le chauffeur', tone: 'primary', confirmLabel: 'Archiver',
      message: `Archiver ${d.full_name} ? Son bus attitré sera libéré et il ne sera plus proposé dans les missions.`,
    }))) return;
    flags.mutate({ id: d.id, is_active: !d.is_active }, {
      onSuccess: () => { toast.success(d.is_active ? 'Chauffeur archivé.' : 'Chauffeur restauré.'); refreshBuses(); }, onError,
    });
  };

  const del = async (d) => {
    if (!(await confirm({
      title: 'Supprimer le chauffeur', confirmLabel: 'Supprimer',
      message: `Supprimer définitivement ${d.full_name} ? Si ce chauffeur a un historique de missions, archivez-le plutôt.`,
    }))) return;
    remove.mutate(d.id, { onSuccess: () => { toast.success('Chauffeur supprimé.'); refreshBuses(); }, onError });
  };

  const newPin = async (d) => {
    if (!(await confirm({
      title: d.has_pin ? 'Nouveau code PIN' : 'Créer un code PIN', tone: 'primary', confirmLabel: 'Générer le code',
      message: d.has_pin
        ? `Générer un nouveau code PIN pour ${d.full_name} ? L'ancien code ne fonctionnera plus.`
        : `Générer un code PIN pour ${d.full_name} ? Il lui permettra de se connecter à l'application chauffeur.`,
    }))) return;
    resetPin.mutate(d.id, { onSuccess: (r) => setPinInfo({ name: d.full_name, pin: r.pin }), onError });
  };

  const menuItems = (d) => [
    { label: 'Modifier', icon: Pencil, onClick: () => setEditing(d) },
    { label: d.has_pin ? 'Nouveau code PIN' : 'Créer un code PIN', icon: KeyRound, onClick: () => newPin(d), hidden: !d.is_active },
    ...(d.is_active
      ? Object.keys(STATUS_ACTION).filter((k) => k !== d.status).map((k) => ({
          label: STATUS_ACTION[k][0], icon: STATUS_ACTION[k][1], onClick: () => changeStatus(d, k),
        }))
      : []),
    { divider: true },
    { label: d.is_active ? 'Archiver' : 'Restaurer', icon: d.is_active ? Archive : ArchiveRestore, onClick: () => toggleArchive(d) },
    { label: 'Supprimer', icon: Trash2, tone: 'danger', onClick: () => del(d) },
  ];
  const menu = (d) => (canWrite ? <ActionMenu items={menuItems(d)} label={d.full_name} /> : null);

  const s = stats.data;

  const columns = [
    { key: 'driver', label: 'Chauffeur', render: (d) => (
      <div className="flex items-center gap-3">
        <Avatar src={d.photo_url} name={d.full_name} size={44} />
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{d.full_name}{!d.is_active && <span className="ml-2 text-xs font-normal text-slate-400">Archivé</span>}</p>
          {d.email && <p className="truncate text-xs text-slate-500">{d.email}</p>}
        </div>
      </div>
    ) },
    { key: 'phone', label: 'Téléphone', render: (d) => (
      <a href={`tel:${d.phone}`} className="inline-flex items-center gap-1.5 whitespace-nowrap"><Phone className="size-3.5" /> {d.phone}</a>
    ) },
    { key: 'bus', label: 'Bus attribué', render: (d) => (
      d.assigned_bus_id ? (
        <>
          <p className="flex items-center gap-2 font-medium text-slate-900">{d.bus_code} <BusTypeBadge value={d.bus_type} /></p>
          <div className="mt-1"><Plate value={d.bus_plate} /></div>
        </>
      ) : (
        <span className={`inline-flex items-center gap-1.5 text-sm ${d.is_active ? 'text-amber-700' : 'text-slate-400'}`}>
          <TriangleAlert className="size-3.5" /> Aucun
        </span>
      )
    ) },
    { key: 'license', label: 'Permis', className: 'min-w-56', render: (d) => (
      <>
        <p className="mb-1 text-xs text-slate-500">N° {d.license_number}</p>
        <DocBadge label="Validité" icon={CreditCard} date={d.license_expires_on} doc={d.license} />
      </>
    ) },
    { key: 'status', label: 'Statut', render: (d) => (
      <div className="flex flex-col items-start gap-1.5">
        <DriverStatusBadge value={d.status} />
      
      </div>
    ) },
    { key: 'actions', label: '', className: 'w-12 text-right', render: (d) => menu(d) },
  ];

  return (
    <>
      <PageHeader
        title="Chauffeurs"
        description="Vos chauffeurs, leurs permis et le bus qui leur est attribué."
        action={canWrite && <Button icon={Plus} onClick={() => setEditing(null)}>Nouveau chauffeur</Button>}
      />

      <StatCards items={[
        { label: 'Chauffeurs actifs', value: s?.total, icon: Users, active: !status && !docs && !bus && !archived, onClick: () => filterBy({}) },
        { label: 'En service', value: s?.active, icon: UserCheck, tone: 'ok', active: status === 'active', onClick: () => filterBy({ status: 'active' }) },
        { label: 'En congé', value: s?.on_leave, icon: CalendarOff, active: status === 'on_leave', onClick: () => filterBy({ status: 'on_leave' }) },
        { label: 'Sans bus attribué', value: s?.without_bus, icon: Bus, tone: s?.without_bus ? 'warn' : undefined, active: bus === 'none', onClick: () => filterBy({ bus: 'none' }) },
        { label: 'Permis à renouveler', value: s?.docs, icon: FileWarning, tone: s?.docs ? 'warn' : undefined, active: docs === 'expiring', onClick: () => filterBy({ docs: 'expiring' }) },
      ]} />

      <FilterBar>
        <SearchBox value={search} onChange={setSearch} onSubmit={() => update({ q: search.trim(), page: '' })}
                   placeholder="Nom, téléphone, permis, bus…" />
        <select className="w-full sm:w-auto sm:min-w-44" value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
          <option value="">Tous les statuts</option>
          {Object.entries(DRIVER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Switch label="Archivés" checked={archived} onChange={(e) => update({ archived: e.target.checked ? '1' : '', page: '' })} />
      </FilterBar>

      {error && <Alert tone="bad">{error.message}</Alert>}

      <Card padded={false} className="overflow-hidden">
        <DataTable
          loading={isLoading}
          rows={data?.items}
          columns={columns}
          empty={archived ? 'Aucun chauffeur archivé.' : 'Aucun chauffeur ne correspond à ces critères.'}
          mobileRender={(d) => <DriverCard d={d} menu={menu(d)} />}
        />
      </Card>

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 20} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />

      {editing !== undefined && (
        <Modal title={editing ? `Modifier ${editing.full_name}` : 'Nouveau chauffeur'} onClose={() => setEditing(undefined)}>
          <DriverForm key={editing?.id ?? 'new'} row={editing} onDone={() => setEditing(undefined)} onCancel={() => setEditing(undefined)} />
        </Modal>
      )}

      {pinInfo && (
        <SecretModal
          title="Code PIN généré"
          intro={`Communiquez ce code à ${pinInfo.name}. Il lui permettra de se connecter à l'application chauffeur.`}
          secret={pinInfo.pin}
          onClose={() => setPinInfo(null)}
        />
      )}
    </>
  );
}