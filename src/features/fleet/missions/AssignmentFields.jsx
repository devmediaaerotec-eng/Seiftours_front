import Field from '@/components/ui/Field';
import { hmOf } from '@/lib/format';
import { BUS_TYPE, DRIVER_STATUS } from '../shared/status';

const when = (i) => `${i.reference} ${hmOf(i.starts_at)}–${hmOf(i.ends_at)}`;

export const useClients = () =>
  useQuery({ queryKey: ['clients'], queryFn: () => api('/admin/fleet/clients'), staleTime: 60_000 });

export const useCreateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/admin/fleet/clients', { method: 'POST', body }),
    onSuccess: (res) => {
      // le nouveau client est dans la liste tout de suite, avant même le rechargement
      qc.setQueryData(['clients'], (old) => ({
        items: [...(old?.items ?? []), res.client].sort((a, b) => a.name.localeCompare(b.name)),
      }));
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useCreateBatch = () =>
  useMissionMutation((body) => api(`${BASE}/batch`, { method: 'POST', body }));
 
export default function AssignmentFields({
  register, errors, options, busy = {}, disabled, onDriverChange, onBusChange,
}) {
  const drivers = options?.drivers ?? [];
  const buses = options?.buses ?? [];

  return (
    <>
      <Field label="Chauffeur *" error={errors.driver_id} hint={disabled ? 'Mission en cours : non modifiable.' : undefined}>
        <select disabled={disabled} {...register('driver_id', { required: 'Choisissez un chauffeur', onChange: onDriverChange })}>
          <option value="">Choisir…</option>

{drivers.map((d) => {
  const b = busy.drivers?.[d.id];
  const load = busy.load?.[d.id];
  return (
    <option key={d.id} value={String(d.id)}>
      {d.full_name}
      {d.status !== 'active' ? ` (${DRIVER_STATUS[d.status]?.label})` : ''}
      {b ? ` — ⚠ déjà ${load > 1 ? `${load} missions` : 'une mission'} : ${when(b)}` : ''}
    </option>
  );
})}
        </select>
      </Field>

      <Field label="Bus *" error={errors.bus_id}>
        <select disabled={disabled} {...register('bus_id', { required: 'Choisissez un bus', onChange: onBusChange })}>
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