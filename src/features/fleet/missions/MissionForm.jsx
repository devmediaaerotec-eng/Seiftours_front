import { useForm } from 'react-hook-form';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { addMinutes, millimesToTnd, tndToMillimes, toInputDT } from '@/lib/format';
import { MISSION_TYPE } from '../shared/status';
import AssignmentFields from './AssignmentFields';
import { missions, useAvailability, useMission, useMissionOptions } from './resource';

const fromMission = (m, shiftMinutes = 0) => {
  const shift = (v) => (shiftMinutes ? addMinutes(toInputDT(v), shiftMinutes) : toInputDT(v));
  return {
    mission_type: m.mission_type, title: m.title,
    starts_at: shift(m.starts_at), ends_at: shift(m.ends_at),
    driver_id: String(m.driver_id), bus_id: String(m.bus_id),
    pickup_place: m.pickup_place ?? '', destination: m.destination ?? '',
    pax: m.pax ? String(m.pax) : '', client_name: m.client_name ?? '', client_phone: m.client_phone ?? '',
    price: millimesToTnd(m.price_millimes), notes: m.notes ?? '',
  };
};

const fromDefaults = (d = {}) => ({
  mission_type: 'rental', title: '',
  starts_at: d.date ? `${d.date}T08:00` : '', ends_at: d.date ? `${d.date}T12:00` : '',
  driver_id: d.driver_id ? String(d.driver_id) : '', bus_id: d.bus_id ? String(d.bus_id) : '',
  pickup_place: '', destination: '', pax: '', client_name: '', client_phone: '', price: '', notes: '',
});

export default function MissionForm({ id, defaults, template, onDone, onCancel }) {
  const detail = useMission(id);
  if (id && detail.isLoading) return <div className="center">Chargement…</div>;
  if (id && detail.error) return <div className="alert bad">{detail.error.message}</div>;

  const m = detail.data?.mission;
  // Dupliquer = même mission, une semaine plus tard
  const initial = id ? fromMission(m) : template ? fromMission(template, 7 * 24 * 60) : fromDefaults(defaults);

  return <FormBody id={id} initial={initial} locked={m?.status === 'in_progress'} onDone={onDone} onCancel={onCancel} />;
}

function FormBody({ id, initial, locked, onDone, onCancel }) {
  const toast = useToast();
  const save = missions.useSave();
  const options = useMissionOptions();
  const {
    register, handleSubmit, watch, setValue, getValues, setError, formState: { errors },
  } = useForm({ defaultValues: initial });

  const [starts, ends] = watch(['starts_at', 'ends_at']);
  const availability = useAvailability(starts, ends, id);
  const buses = options.data?.buses ?? [];
  const drivers = options.data?.drivers ?? [];

  const onStartChange = (e) => {
    const v = e.target.value;
    const end = getValues('ends_at');
    if (v && (!end || end <= v)) setValue('ends_at', addMinutes(v, 240), { shouldValidate: true });
  };

  // Le chauffeur choisi propose son bus attitré si aucun bus n'est encore choisi
  const onDriverChange = (e) => {
    const d = drivers.find((x) => String(x.id) === e.target.value);
    if (d?.assigned_bus_id && !getValues('bus_id')) setValue('bus_id', String(d.assigned_bus_id), { shouldValidate: true });
  };

  const submit = handleSubmit(async (v) => {
    const body = {
      mission_type: v.mission_type,
      title: v.title,
      bus_id: Number(v.bus_id),
      driver_id: Number(v.driver_id),
      starts_at: v.starts_at,
      ends_at: v.ends_at,
      pickup_place: v.pickup_place,
      destination: v.destination,
      pax: v.pax === '' ? null : Number(v.pax),
      client_name: v.client_name,
      client_phone: v.client_phone,
      price_millimes: tndToMillimes(v.price),
      notes: v.notes,
    };
    try {
      const res = await save.mutateAsync({ id, body });
      (res.warnings ?? []).forEach((w) => toast.warn(w));
      toast.success(id ? 'Mission modifiée.' : 'Mission créée.');
      onDone(res.mission);
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        Object.entries(e.data.violations).forEach(([k, msg]) => setError(k === 'price_millimes' ? 'price' : k, { type: 'server', message: msg }));
        toast.error('Certains champs sont invalides.');
      } else {
        toast.error(e.message);
      }
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <h4 className="form-section">Mission</h4>
      <div className="form-grid">
        <Field label="Type" error={errors.mission_type}>
          <select {...register('mission_type')}>
            {Object.entries(MISSION_TYPE).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </Field>
        <Field label="Intitulé *" error={errors.title} hint="Ex. Transfert aéroport Monastir → Hôtel Riadh">
          <input autoFocus {...register('title', { required: 'Champ requis', maxLength: { value: 190, message: '190 caractères maximum' } })} />
        </Field>
      </div>

      <h4 className="form-section">Horaires</h4>
      <div className="form-grid">
        <Field label="Début *" error={errors.starts_at}>
          <input type="datetime-local" {...register('starts_at', { required: 'Champ requis', onChange: onStartChange })} />
        </Field>
        <Field label="Fin *" error={errors.ends_at}>
          <input type="datetime-local" {...register('ends_at', {
            required: 'Champ requis',
            validate: (v) => !getValues('starts_at') || v > getValues('starts_at') || 'La fin doit être après le début',
          })} />
        </Field>
      </div>

      <h4 className="form-section">Affectation</h4>
      {availability.isFetching && <small className="muted">Vérification des disponibilités…</small>}
      <div className="form-grid">
        <AssignmentFields register={register} errors={errors} options={options.data}
                          busy={availability.data} disabled={locked} onDriverChange={onDriverChange} />
      </div>

      <h4 className="form-section">Trajet et client</h4>
      <div className="form-grid">
        <Field label="Lieu de prise en charge" error={errors.pickup_place}><input {...register('pickup_place')} /></Field>
        <Field label="Destination" error={errors.destination}><input {...register('destination')} /></Field>
        <Field label="Nombre de passagers" error={errors.pax}>
          <input inputMode="numeric" {...register('pax', {
            validate: (v) => {
              if (v === '') return true;
              if (!/^\d+$/.test(v) || Number(v) < 1) return 'Nombre invalide';
              const bus = buses.find((b) => String(b.id) === getValues('bus_id'));
              return !bus || Number(v) <= bus.seats || `Ce bus n'a que ${bus.seats} places`;
            },
          })} />
        </Field>
        <Field label="Prix (TND)" error={errors.price} hint="Optionnel.">
          <input inputMode="decimal" {...register('price', {
            validate: (v) => v === '' || /^\d+([.,]\d{1,3})?$/.test(v.trim()) || 'Montant invalide (ex. 450 ou 450.500)',
          })} />
        </Field>
        <Field label="Client" error={errors.client_name}><input {...register('client_name')} /></Field>
        <Field label="Téléphone du client" error={errors.client_phone}>
          <input inputMode="tel" {...register('client_phone', {
            validate: (v) => v === '' || /^[+0-9 ().-]{6,30}$/.test(v) || 'Numéro invalide',
          })} />
        </Field>
        <Field label="Consignes pour le chauffeur" className="span-2" error={errors.notes}
               hint="Reprises dans le message envoyé au chauffeur.">
          <textarea rows="3" {...register('notes')} />
        </Field>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
        <button className="btn" disabled={save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}