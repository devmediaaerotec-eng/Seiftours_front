import { CreditCard, MessageCircle, Phone, TriangleAlert } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { BusTypeBadge, DriverStatusBadge } from '../shared/badges';
import DocBadge from '../shared/DocBadge';
import Plate from '../shared/Plate';
import { BUS_TYPE } from '../shared/status';

export default function DriverCard({ d, menu }) {
  const digits = String(d.phone ?? '').replace(/\D/g, '');
  const BusIcon = BUS_TYPE[d.bus_type]?.icon;

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <Avatar src={d.photo_url} name={d.full_name} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{d.full_name}</p>
          <p className="truncate text-sm text-slate-500">{d.phone}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <DriverStatusBadge value={d.status} />
            {!d.is_active && <Badge>Archivé</Badge>}
          </div>
        </div>
        {menu}
      </div>

      <div className="mt-3.5 space-y-2">
        {d.assigned_bus_id ? (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{BusIcon && <BusIcon className="size-4" />}</span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">{d.bus_code} <BusTypeBadge value={d.bus_type} /></p>
              <Plate value={d.bus_plate} />
            </div>
          </div>
        ) : (
          <div className={`flex items-center gap-2 rounded-lg p-2.5 text-sm ${d.is_active ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-500'}`}>
            <TriangleAlert className="size-4 shrink-0" /> Aucun bus attribué
          </div>
        )}
        <DocBadge label={`Permis ${d.license_number}`} icon={CreditCard} date={d.license_expires_on} doc={d.license} />
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <Button as="a" href={`tel:${d.phone}`} variant="secondary" size="sm" icon={Phone}>Appeler</Button>
        {digits
          ? <Button as="a" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm" icon={MessageCircle}>WhatsApp</Button>
          : <Button variant="secondary" size="sm" icon={MessageCircle} disabled>WhatsApp</Button>}
      </div>
    </div>
  );
}