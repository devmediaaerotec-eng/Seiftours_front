import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronRight, Hotel } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import { FilterBar, SearchBox } from '@/components/ui/Filters';
import PageHeader from '@/components/ui/PageHeader';
import Pagination from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { STATUS, fmtDate, money } from '@/lib/format';
import { bookings } from '../resource';

const pct = (b) => (b.total_millimes > 0 ? Math.min(100, Math.round((b.paid_millimes / b.total_millimes) * 100)) : 0);

function StatusPills({ value, onChange }) {
  const items = [['', 'Toutes'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])];
  return (
    <div className="-mx-4 mb-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {items.map(([k, label]) => (
          <button
            key={k || 'all'}
            type="button"
            aria-pressed={value === k}
            onClick={() => onChange(k)}
            className={cn(
              'whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition',
              value === k ? 'bg-brand-600 text-white shadow-xs' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BookingCard({ b }) {
  return (
    <Link to={`/bookings/${b.reference}`} className="block px-4 py-4 transition active:bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-700">{b.reference}</p>
          <p className="truncate text-sm font-medium text-slate-900">{b.customer_name}</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge tone={STATUS[b.status]?.cls} dot>{STATUS[b.status]?.label || b.status}</Badge>
          <ChevronRight className="size-4 text-slate-300" />
        </div>
      </div>

      <p className="mt-2.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
        <Hotel className="size-3.5 shrink-0" /> {b.hotel_name || 'Aucun hôtel'}
      </p>
      {b.check_in && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="size-3.5 shrink-0" /> {fmtDate(b.check_in)} → {fmtDate(b.check_out)}{b.nights ? ` · ${b.nights} nuits` : ''}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct(b)}%` }} />
        </div>
        <span className="text-xs text-slate-500">{pct(b)} % payé</span>
        <span className="text-sm font-semibold text-slate-900">{money(b.total_millimes)}</span>
      </div>
    </Link>
  );
}

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

      <FilterBar className="mb-3">
        <SearchBox value={search} onChange={setSearch} onSubmit={() => update({ q: search.trim(), page: '' })}
                   placeholder="Référence, nom, e-mail, téléphone…" />
      </FilterBar>
      <StatusPills value={status} onChange={(s) => update({ status: s, page: '' })} />

      {error && <Alert tone="bad">{error.message}</Alert>}

      <Card padded={false} className="overflow-hidden">
        <DataTable
          loading={isLoading}
          rows={data?.items}
          empty="Aucune réservation ne correspond à ces critères."
          mobileRender={(b) => <BookingCard b={b} />}
          columns={[
            { key: 'reference', label: 'Référence', render: (b) => <Link to={`/bookings/${b.reference}`} className="font-semibold">{b.reference}</Link> },
            { key: 'client', label: 'Client', render: (b) => (<>{b.customer_name}<span className="block text-xs text-slate-500">{b.phone}</span></>) },
            { key: 'hotel', label: 'Hôtel', render: (b) => b.hotel_name || '—' },
            { key: 'stay', label: 'Séjour', render: (b) => (
              <span className="whitespace-nowrap">{fmtDate(b.check_in)} → {fmtDate(b.check_out)}
                {b.nights ? <span className="block text-xs text-slate-500">{b.nights} nuits</span> : null}</span>
            ) },
            { key: 'total', label: 'Montant', render: (b) => (
              <div className="min-w-32">
                <span className="whitespace-nowrap font-medium text-slate-900">{money(b.total_millimes)}</span>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct(b)}%` }} />
                </div>
                <span className="mt-1 block text-xs text-slate-500">{pct(b)} % payé</span>
              </div>
            ) },
            { key: 'branch', label: 'Agence', render: (b) => b.branch_name || <span className="text-slate-400">En ligne</span> },
            { key: 'status', label: 'Statut', render: (b) => <Badge tone={STATUS[b.status]?.cls} dot>{STATUS[b.status]?.label || b.status}</Badge> },
          ]}
        />
      </Card>

      <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 20} onChange={(p) => update({ page: p > 1 ? String(p) : '' })} />
    </>
  );
}