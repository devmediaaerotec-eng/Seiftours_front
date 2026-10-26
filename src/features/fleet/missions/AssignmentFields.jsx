import Field from '@/components/ui/Field';
import { hmOf } from '@/lib/format';
import { BUS_TYPE, DRIVER_STATUS } from '../shared/status';

const when = (i) => `${i.reference} ${hmOf(i.starts_at)}–${hmOf(i.ends_at)}`;

export default function AssignmentFields({ register, errors, options, busy = {}, disabled, onDriverChange }) {
  const drivers = options?.drivers ?? [];
  const buses = options?.buses ?? [];

  return (
    <>
      <Field label="Chauffeur *" error={errors.driver_id} hint={disabled ? 'Mission en cours : non modifiable.' : undefined}>
        <select disabled={disabled} {...register('driver_id', { required: 'Choisissez un chauffeur', onChange: onDriverChange })}>
          <option value="">Choisir…</option>
          {drivers.map((d) => {
            const b = busy.drivers?.[d.id];
            return (
              <option key={d.id} value={String(d.id)} disabled={!!b}>
                {d.full_name}{d.status !== 'active' ? ` (${DRIVER_STATUS[d.status]?.label})` : ''}{b ? ` — occupé : ${when(b)}` : ''}
              </option>
            );
          })}
        </select>
      </Field>

      <Field label="Bus *" error={errors.bus_id}>
        <select disabled={disabled} {...register('bus_id', { required: 'Choisissez un bus' })}>
          <option value="">Choisir…</option>
          {buses.map((b) => {
            const o = busy.buses?.[b.id];
            return (
              <option key={b.id} value={String(b.id)} disabled={!!o}>
                {b.code} · {b.plate_number} · {BUS_TYPE[b.bus_type]?.label} · {b.seats} pl.
                {b.status === 'maintenance' ? ' — maintenance' : b.status === 'out_of_service' ? ' — hors service' : ''}
                {o ? ` — occupé : ${when(o)}` : ''}
              </option>
            );
          })}
        </select>
      </Field>
    </>
  );
}