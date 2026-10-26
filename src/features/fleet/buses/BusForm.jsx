import { Controller, useForm } from 'react-hook-form';
import Field from '@/components/ui/Field';
import ImageUpload from '@/components/ui/ImageUpload';
import { useToast } from '@/components/ui/Toast';
import { BUS_STATUS, BUS_TYPE } from '../shared/status';
import { buses } from './resource';

const num = (v) => (v === '' || v == null ? null : Number(v));

export default function BusForm({ row, onDone, onCancel }) {
  const toast = useToast();
  const save = buses.useSave();
  const onMission = row?.status === 'on_mission';

  const { register, control, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: {
      code: row?.code ?? '',
      bus_type: row?.bus_type ?? 'minibus',
      plate_number: row?.plate_number ?? '',
      brand: row?.brand ?? '',
      model: row?.model ?? '',
      seats: row ? String(row.seats) : '',
      year_made: row?.year_made ? String(row.year_made) : '',
      status: row?.status ?? 'available',
      insurance_expires_on: row?.insurance_expires_on?.slice(0, 10) ?? '',
      inspection_expires_on: row?.inspection_expires_on?.slice(0, 10) ?? '',
      gps_device_id: row?.gps_device_id ?? '',
      notes: row?.notes ?? '',
      image_url: row?.image_url ?? '',
      is_active: row?.is_active ?? true,
    },
  });

  const submit = handleSubmit(async (v) => {
    const body = { ...v, seats: num(v.seats), year_made: num(v.year_made) };
    try {
      await save.mutateAsync({ id: row?.id, body });
      toast.success('Enregistré.');
      onDone();
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        Object.entries(e.data.violations).forEach(([k, m]) => setError(k, { type: 'server', message: m }));
        toast.error('Certains champs sont invalides.');
      } else {
        toast.error(e.message);
      }
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        <div className="field span-2">
          <span className="field-label">Type de bus *</span>
          <div className="radio-row">
            {Object.entries(BUS_TYPE).map(([k, t]) => (
              <label key={k}><input type="radio" value={k} {...register('bus_type', { required: 'Choisissez un type' })} /> {t.label}</label>
            ))}
          </div>
          {errors.bus_type && <small className="field-error">{errors.bus_type.message}</small>}
        </div>

        <Field label="Code du bus *" error={errors.code} hint="Numéro de parc, ex. BUS-01 (mis en majuscules).">
          <input autoFocus {...register('code', { required: 'Champ requis', maxLength: { value: 30, message: '30 caractères maximum' } })} />
        </Field>
        <Field label="Immatriculation *" error={errors.plate_number}>
          <input placeholder="123 TUN 4567" {...register('plate_number', { required: 'Champ requis', maxLength: { value: 20, message: '20 caractères maximum' } })} />
        </Field>
        <Field label="Marque" error={errors.brand}><input {...register('brand')} /></Field>
        <Field label="Modèle" error={errors.model}><input {...register('model')} /></Field>
        <Field label="Nombre de places *" error={errors.seats}>
          <input inputMode="numeric" {...register('seats', {
            required: 'Champ requis',
            validate: (v) => (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 90) || 'Entre 1 et 90',
          })} />
        </Field>
        <Field label="Année de mise en circulation" error={errors.year_made}>
          <input inputMode="numeric" {...register('year_made', {
            validate: (v) => v === '' || (/^\d{4}$/.test(v) && Number(v) >= 1980) || 'Année invalide',
          })} />
        </Field>
        <Field label="Statut" error={errors.status} hint={onMission ? 'Géré par les missions tant que le bus est en mission.' : undefined}>
          <select disabled={onMission} {...register('status')}>
            {Object.entries(BUS_STATUS)
              .filter(([k]) => k !== 'on_mission' || onMission)
              .map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Boîtier GPS (identifiant)" error={errors.gps_device_id} hint="Vide si le suivi se fait par l'application chauffeur.">
          <input {...register('gps_device_id')} />
        </Field>
        <Field label="Fin de l'assurance" error={errors.insurance_expires_on}>
          <input type="date" {...register('insurance_expires_on')} />
        </Field>
        <Field label="Fin de la visite technique" error={errors.inspection_expires_on}>
          <input type="date" {...register('inspection_expires_on')} />
        </Field>

        <div className="field span-2">
          <span className="field-label">Photo du bus</span>
          <Controller name="image_url" control={control}
            render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} folder="buses" />} />
          {errors.image_url && <small className="field-error">{errors.image_url.message}</small>}
        </div>

        <Field label="Notes internes" className="span-2" error={errors.notes}>
          <textarea rows="3" {...register('notes')} />
        </Field>
        <div className="field">
          <label className="chk"><input type="checkbox" {...register('is_active')} /> Bus actif dans le parc</label>
          <small className="muted">Archiver un bus libère son chauffeur attitré.</small>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
        <button className="btn" disabled={save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}