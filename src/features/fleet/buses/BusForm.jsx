import { Controller, useForm } from 'react-hook-form';
import { Bus, Camera, FileText, Satellite, Tag, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import { FormActions, FormGrid, FormSection } from '@/components/ui/FormParts';
import ImageUpload from '@/components/ui/ImageUpload';
import RadioCards from '@/components/ui/RadioCards';
import Switch from '@/components/ui/Switch';
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
      toast.success('Bus enregistré.');
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
      <FormSection icon={Bus} title="Type de véhicule">
        <RadioCards
          name="bus_type"
          register={register}
          rules={{ required: 'Choisissez un type' }}
          options={Object.entries(BUS_TYPE).map(([value, t]) => ({ value, label: t.label, icon: t.icon }))}
        />
        {errors.bus_type && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.bus_type.message}</p>}
      </FormSection>

      <FormSection icon={Tag} title="Identification">
        <FormGrid>
          <Field label="Code du bus *" error={errors.code} hint="Numéro de parc, ex. BUS-01 (mis en majuscules).">
            <input autoFocus {...register('code', { required: 'Champ requis', maxLength: { value: 30, message: '30 caractères maximum' } })} />
          </Field>
          <Field label="Immatriculation *" error={errors.plate_number}>
            <input placeholder="123 TUN 4567" {...register('plate_number', { required: 'Champ requis', maxLength: { value: 20, message: '20 caractères maximum' } })} />
          </Field>
          <Field label="Marque" error={errors.brand}><input {...register('brand')} /></Field>
          <Field label="Modèle" error={errors.model}><input {...register('model')} /></Field>
        </FormGrid>
      </FormSection>

      <FormSection icon={Users} title="Capacité">
        <FormGrid>
          <Field label="Nombre de places *" error={errors.seats}>
            <input inputMode="numeric" {...register('seats', {
              required: 'Champ requis',
              validate: (v) => (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 90) || 'Entre 1 et 90',
            })} />
          </Field>
          <Field label="Année de mise en circulation" error={errors.year_made}>
            <input inputMode="numeric" placeholder="2022" {...register('year_made', {
              validate: (v) => v === '' || (/^\d{4}$/.test(v) && Number(v) >= 1980) || 'Année invalide',
            })} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection icon={FileText} title="Documents" description="Une alerte vous prévient 30 jours avant chaque échéance.">
        <FormGrid>
          <Field label="Fin de l'assurance" error={errors.insurance_expires_on}>
            <input type="date" {...register('insurance_expires_on')} />
          </Field>
          <Field label="Fin de la visite technique" error={errors.inspection_expires_on}>
            <input type="date" {...register('inspection_expires_on')} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection icon={Satellite} title="Statut et suivi">
        <FormGrid>
          <Field label="Statut" error={errors.status} hint={onMission ? 'Géré par les missions tant que le bus est en mission.' : undefined}>
            <select disabled={onMission} {...register('status')}>
              {Object.entries(BUS_STATUS)
                .filter(([k]) => k !== 'on_mission' || onMission)
                .map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Boîtier GPS (identifiant)" error={errors.gps_device_id} hint="Laissez vide si le bus n'a pas de boîtier.">
            <input {...register('gps_device_id')} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection icon={Camera} title="Photo et notes">
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Photo du bus</span>
            <Controller name="image_url" control={control}
              render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} folder="buses" />} />
            {errors.image_url && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.image_url.message}</p>}
          </div>
          <Field label="Notes internes" error={errors.notes}>
            <textarea rows="3" {...register('notes')} />
          </Field>
        </div>
      </FormSection>

      <div className="mt-6 rounded-xl bg-slate-50 p-4">
        <Switch label="Bus actif dans le parc" description="Archiver un bus libère son chauffeur attitré." {...register('is_active')} />
      </div>

      <FormActions>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="w-full sm:w-auto" loading={save.isPending}>Enregistrer</Button>
      </FormActions>
    </form>
  );
}