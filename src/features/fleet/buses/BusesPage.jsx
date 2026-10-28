import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Archive, ArchiveRestore, Bus, CheckCircle2, FileWarning, LayoutGrid, List, Pencil, Plus, Route, Trash2, Wrench,
} from 'lucide-react';
import ActionMenu from '@/components/ui/ActionMenu';
import Alert from '@/components/ui/Alert';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import DataTable from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import { FilterBar, SearchBox } from '@/components/ui/Filters';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import Segmented from '@/components/ui/Segmented';
import Switch from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { errText } from '@/lib/errors';
import { assetUrl } from '@/lib/format';
import { BusStatusBadge, BusTypeBadge } from '../shared/badges';
import DocBadge from '../shared/DocBadge';
import Plate from '../shared/Plate';
import StatCards from '../shared/StatCards';
import { BUS_STATUS } from '../shared/status';
import BusCard from './BusCard';
import BusForm from './BusForm';
import { buses, useBusStats, useBusStatus } from './resource';

const STATUS_ACTION = { available: 'Marquer disponible', maintenance: 'Mettre en maintenance', out_of_service: 'Mettre hors service' };

export default function BusesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const { can } = useAuth();
  const canWrite = can('fleet.manage');

  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const type = params.get('type') || '';
  const docs = params.get('docs') || '';
  const view = params.get('view') === 'table' ? 'table' : 'cards';
  const archived = params.get('archived') === '1';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);
  const [editing, setEditing] = useState(undefined);   // undefined = fermé, null = nouveau bus

  const stats = useBusStats();
  const { data, isLoading, error } = buses.useList({ status, type, docs, q, page, limit: 20, archived: archived ? '1' : '' });
  const flags = buses.useFlags();
  const remove = buses.useRemove();
  const setStatus = useBusStatus();

  const items = data?.items ?? [];
  const onError = (e) => toast.error(errText(e));
  const refreshDrivers = () => qc.invalidateQueries({ queryKey: ['drivers'] });

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };
  const filterBy = (patch) => update({ status: '', type: '', docs: '', archived: '', page: '', ...patch });

  const changeStatus = (b, to) =>
    setStatus.mutate({ id: b.id, status: to }, {
      onSuccess: () => toast.success(`${b.code} : ${BUS_STATUS[to].label}.`), onError,
    });

  const toggleArchive = async (b) => {
    if (b.is_active && !(await confirm({
      title: 'Archiver le bus', tone: 'primary', confirmLabel: 'Archiver',
      message: `Archiver ${b.code} ? Son chauffeur attitré sera libéré et le bus n'apparaîtra plus dans les missions.`,
    }))) return;
    flags.mutate({ id: b.id, is_active: !b.is_active }, {
      onSuccess: () => { toast.success(b.is_active ? 'Bus archivé.' : 'Bus restauré.'); refreshDrivers(); }, onError,
    });
  };

  const del = async (b) => {
    if (!(await confirm({
      title: 'Supprimer le bus', confirmLabel: 'Supprimer',
      message: `Supprimer définitivement ${b.code} ? Si le bus a un historique de missions, archivez-le plutôt.`,
    }))) return;
    remove.mutate(b.id, { onSuccess: () => { toast.success('Bus supprimé.'); refreshDrivers(); }, onError });
  };

  const menuItems = (b) => [
    { label: 'Modifier', icon: Pencil, onClick: () => setEditing(b) },
    ...(b.is_active && b.status !== 'on_mission'
      ? Object.keys(STATUS_ACTION).filter((k) => k !== b.status).map((k) => ({
          label: STATUS_ACTION[k], icon: BUS_STATUS[k].icon, onClick: () => changeStatus(b, k),
        }))
      : []),
    { divider: true },
    { label: b.is_active ? 'Archiver' : 'Restaurer', icon: b.is_active ? Archive : ArchiveRestore, onClick: () => toggleArchive(b) },
    { label: 'Supprimer', icon: Trash2, tone: 'danger', onClick: () => del(b) },
  ];
  const menu = (b) => (canWrite ? <ActionMenu items={menuItems(b)} label={b.code} /> : null);

  const s = stats.data;

  const cardsGrid = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {isLoading && items.length === 0 && Array.from({ length: 6 }, (_, i) => <div key={i} className="h-96 animate-pulse rounded-xl bg-slate-200/60" />)}
      {items.map((b) => <BusCard key={b.id} b={b} menu={menu(b)} onEdit={canWrite ? () => setEditing(b) : undefined} />)}
    </div>
  );

  const columns = [
    { key: 'bus', label: 'Bus', render: (b) => (
      <div className="flex items-center gap-3">
        {b.image_url
          ? <img src={assetUrl(b.image_url)} alt="" className="h-10 w-14 rounded-md object-cover" />
          : <span className="flex h-10 w-14 items-center justify-center rounded-md bg-slate-100 text-slate-400"><Bus className="size-5" /></span>}
        <div>
          <p className="font-semibold text-slate-900">{b.code}{!b.is_active && <span className="ml-2 text-xs font-normal text-slate-400">Archivé</span>}</p>
          <Plate value={b.plate_number} />
        </div>
      </div>
    ) },
    { key: 'vehicle', label: 'Véhicule', render: (b) => (
      <>
        <BusTypeBadge value={b.bus_type} />
        <p className="mt-1 text-sm text-slate-800">{[b.brand, b.model].filter(Boolean).join(' ') || '—'}</p>
        <p className="text-xs text-slate-500">{b.seats} places{b.year_made ? ` · ${b.year_made}` : ''}{b.gps_device_id ? ` · GPS ${b.gps_device_id}` : ''}</p>
      </>
    ) },
    { key: 'driver', label: 'Chauffeur attitré', render: (b) => (
      b.driver_name
        ? <div className="flex items-center gap-2.5"><Avatar src={b.driver_photo} name={b.driver_name} size={32} /><span className="text-sm">{b.driver_name}</span></div>
        : <span className="text-slate-400">Aucun</span>
    ) },
    { key: 'status', label: 'Statut', render: (b) => <BusStatusBadge value={b.status} /> },
    { key: 'docs', label: 'Documents', className: 'min-w-60', render: (b) => (
      <div className="space-y-1.5">
        <DocBadge label="Assurance" date={b.insurance_expires_on} doc={b.insurance} />
        <DocBadge label="Visite technique" date={b.inspection_expires_on} doc={b.inspection} />
      </div>
    ) },
    { key: 'actions', label: '', className: 'w-12 text-right', render: (b) => menu(b) },
  ];

  return (
    <>
      <PageHeader
        title="Bus"
        description="Votre parc de minibus et microbus, leurs documents et leur chauffeur attitré."
        action={canWrite && <Button icon={Plus} onClick={() => setEditing(null)}>Nouveau bus</Button>}
      />

      <StatCards items={[
        { label: 'Bus actifs', value: s?.total, icon: Bus, active: !status && !docs && !type && !archived, onClick: () => filterBy({}) },
        { label: 'Disponibles', value: s?.available, icon: CheckCircle2, tone: 'ok', active: status === 'available', onClick: () => filterBy({ status: 'available' }) },
        { label: 'En mission', value: s?.on_mission, icon: Route, active: status === 'on_mission', onClick: () => filterBy({ status: 'on_mission' }) },
        { label: 'Maintenance / hors service', value: (s?.maintenance ?? 0) + (s?.out_of_service ?? 0), icon: Wrench,
          tone: (s?.maintenance ?? 0) + (s?.out_of_service ?? 0) ? 'warn' : undefined, active: status === 'maintenance', onClick: () => filterBy({ status: 'maintenance' }) },
        { label: 'Documents à renouveler', value: s?.docs, icon: FileWarning, tone: s?.docs ? 'warn' : undefined, active: docs === 'expiring', onClick: () => filterBy({ docs: 'expiring' }) },
      ]} />

      <FilterBar>
        <SearchBox value={search} onChange={setSearch} onSubmit={() => update({ q: search.trim(), page: '' })}
                   placeholder="Code, immatriculation, marque, chauffeur…" />
        <Segmented value={type} onChange={(v) => update({ type: v, page: '' })}
                   options={[['', `Tous (${s?.total ?? 0})`], ['minibus', `Minibus (${s?.minibus ?? 0})`], ['microbus', `Microbus (${s?.microbus ?? 0})`]]} />
        <select className="w-full sm:w-auto sm:min-w-44" value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
          <option value="">Tous les statuts</option>
          {Object.entries(BUS_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Switch label="Archivés" checked={archived} onChange={(e) => update({ archived: e.target.checked ? '1' : '', page: '' })} />
        <div className="ml-auto hidden md:block">
          <Segmented value={view} onChange={(v) => update({ view: v === 'table' ? 'table' : '' })}
                     options={[['cards', <LayoutGrid key="g" className="size-4" aria-label="Cartes" />], ['table', <List key="l" className="size-4" aria-label="Tableau" />]]} />
        </div>
      </FilterBar>

      {error && <Alert tone="bad">{error.message}</Alert>}

      {!isLoading && items.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon={Bus} title={archived ? 'Aucun bus archivé' : 'Aucun bus ne correspond'}
                      text={archived ? undefined : 'Modifiez vos filtres ou ajoutez un bus au parc.'}
                      action={canWrite && !archived && <Button icon={Plus} onClick={() => setEditing(null)}>Ajouter un bus</Button>} />
        </Card>
      ) : view === 'table' ? (
        <>
          <Card padded={false} className="hidden overflow-hidden md:block"><DataTable loading={isLoading} rows={items} columns={columns} /></Card>
          <div className="md:hidden">{cardsGrid}</div>
        </>
      ) : cardsGrid}

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