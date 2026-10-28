import Badge from '@/components/ui/Badge';
import { BUS_STATUS, BUS_TYPE, DRIVER_STATUS } from './status';

const make = (map) =>
  function StatusBadge({ value, className }) {
    const s = map[value];
    if (!s) return <Badge className={className}>{value}</Badge>;
    const Icon = s.icon;
    return <Badge tone={s.cls} className={className}>{Icon && <Icon className="size-3" />}{s.label}</Badge>;
  };

export const BusStatusBadge = make(BUS_STATUS);
export const BusTypeBadge = make(BUS_TYPE);
export const DriverStatusBadge = make(DRIVER_STATUS);