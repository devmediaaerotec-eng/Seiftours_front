import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarCheck } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import { FilterBar, SearchBox } from '@/components/ui/Filters';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import { STATUS, fmtDate, money } from '@/lib/format';
import { bookings } from '../resource';

export default function Bookings() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);

  const { data, isLoading, error } = bookings.useList({ status, q, page, limit: 20 });

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Réservations" description="Suivez les devis agence et les paiements en ligne." />

      <FilterBar>
        <SearchBox value={search} onChange={setSearch} onSubmit={() => update({ q: search.trim(), page: '' })}
                   placeholder="Référence, nom, e-mail, téléphone…" />
        <select className="w-auto min-w-48" value={status} onChange={(e) => update({ status: e.target.value, page: '' })}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </FilterBar>

      {error && <Alert tone="bad">{error.message}</Alert>}

      <Card padded={false} className="overflow-hidden">
        <DataTable
          loading={isLoading}
          rows={data?.items}
          empty="Aucune réservation ne correspond à ces critères."
          columns={[
            { key: 'reference', label: 'Référence', render: (b) => <Link to={`/bookings/${b.reference}`} className="font-medium">{b.reference}</Link> },
            { key: 'client', label: 'Client', render: (b) => (<>{b.customer_name}<span className="block text-xs text-slate-500">{b.phone}</span></>) },
            { key: 'hotel', label: 'Hôtel', render: (b) => b.hotel_name || '—' },
            { key: 'stay', label: 'Séjour', render: (b) => (
              <span className="whitespace-nowrap">{fmtDate(b.check_in)} → {fmtDate(b.check_out)}
                <span className="block text-xs text-slate-500">{b.nights} nuits</span></span>
            ) },
            { key: 'total', label: 'Total', render: (b) => <span className="whitespace-nowrap">{money(b.total_millimes)}</span> },
            { key: 'paid', label: 'Payé', render: (b) => <span className="whitespace-nowrap">{money(b.paid_millimes)}</span> },
            { key: 'branch', label: 'Agence', render: (b) => b.branch_name || <span className="text-slate-400">—</span> },
            { key: 'status', label: 'Statut', render: (b) => <Badge tone={STATUS[b.status]?.cls} dot>{STATUS[b.status]?.label || b.status}</Badge> },
          ]}
        />
      </Card>

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 20} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />
    </>
  );
}