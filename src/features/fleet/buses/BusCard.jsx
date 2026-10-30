import { Bus, CalendarDays, ClipboardCheck, Pencil, Satellite, ShieldCheck, UserRound, Users } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { assetUrl } from '@/lib/format';
import { BusStatusBadge, BusTypeBadge } from '../shared/badges';
import DocBadge from '../shared/DocBadge';
import Plate from '../shared/Plate';
import { BUS_TYPE } from '../shared/status';

export default function BusCard({ b, menu, onEdit }) {
  const TypeIcon = BUS_TYPE[b.bus_type]?.icon ?? Bus;
  const specs = [
    [Users, b.seats, 'places'],
    [CalendarDays, b.year_made ?? '—', 'année'],
    [Satellite, b.gps_device_id ? 'Oui' : 'Non', 'GPS'],
  ];

  return (
    <article className={cn('flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70 transition hover:shadow-md', !b.is_active && 'opacity-80')}>
      <div className="relative aspect-video bg-slate-100">
        {b.image_url ? (
          <img src={assetUrl(b.image_url)} alt={`Bus ${b.code}`} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-linear-to-br from-brand-50 to-brand-100 text-brand-300">
            <TypeIcon className="size-14" strokeWidth={1.25} />
          </div>
        )}
        <BusTypeBadge value={b.bus_type} className="absolute left-3 top-3 bg-white/95 shadow-xs" />
        <BusStatusBadge value={b.status} className="absolute right-3 top-3 bg-white/95 shadow-xs" />
        {!b.is_active && (
          <span className="absolute bottom-3 left-3 rounded-full bg-slate-900/75 px-2.5 py-0.5 text-xs font-medium text-white">Archivé</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold leading-tight text-slate-900">{b.code}</h3>
            <div className="mt-1.5"><Plate value={b.plate_number} /></div>
          </div>
          {menu}
        </div>

        <p className="-mt-1.5 truncate text-sm text-slate-500">{[b.brand, b.model].filter(Boolean).join(' ') || 'Marque non renseignée'}</p>

        <dl className="grid grid-cols-3 gap-2">
          {specs.map(([Icon, value, label]) => (
            <div key={label} className="rounded-lg bg-slate-50 px-2 py-2 text-center">
              <Icon className="mx-auto size-4 text-slate-400" />
              <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
              <dt className="text-[11px] text-slate-500">{label}</dt>
            </div>
          ))}
        </dl>

        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5">
          {b.driver_name ? (
            <>
              <Avatar src={b.driver_photo} name={b.driver_name} size={34} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{b.driver_name}</p>
               </div>
            </>
          ) : (
            <>
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-400"><UserRound className="size-4" /></span>
             </>
          )}
        </div>

        <div className="space-y-1.5">
          <DocBadge label="Assurance" icon={ShieldCheck} date={b.insurance_expires_on} doc={b.insurance} />
          <DocBadge label="Visite technique" icon={ClipboardCheck} date={b.inspection_expires_on} doc={b.inspection} />
        </div>

        {onEdit && (
          <div className="mt-auto pt-1">
            <Button variant="secondary" size="sm" icon={Pencil} className="w-full" onClick={onEdit}>Modifier</Button>
          </div>
        )}
      </div>
    </article>
  );
}