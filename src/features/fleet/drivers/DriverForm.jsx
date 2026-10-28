import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Bus, CreditCard, KeyRound, Mail, Phone, UserRound } from 'lucide-react';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import { FormActions, FormGrid, FormSection } from '@/components/ui/FormParts';
import ImageUpload from '@/components/ui/ImageUpload';
import RadioCards from '@/components/ui/RadioCards';
import Switch from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { BUS_TYPE, DRIVER_STATUS } from '../shared/status';
import { drivers, useDriverFormOptions } from './resource';

// 98123456 -> +21698123456 ; espaces et points retirés
const normalizePhone = (s) => {
  const t = s.replace(/[\s.\-()]/g, '');
  return /^\d{8}$/.test(t) ? `+216${t}` : t;
};

const STATUS_HINT = {
  active: 'Disponible pour les missions.',
  on_leave: 'Absent : un avertissement apparaît si on l\'affecte.',
  suspended: 'Ne peut plus être affecté à une mission.',
};

const iconCls = 'pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400';

export default function DriverForm({ row, onDone, onCancel }) {
  const toast = useToast();
  const qc = useQueryClient();
  const save = drivers.useSave();
  const options = useDriverFormOptions();
  const currentBus = row?.assigned_bus_id ? String(row.assigned_bus_id) : '';

  const { register, control, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: {
      first_name: row?.first_name ?? '',
      last_name: row?.last_name ?? '',
      phone: row?.phone ?? '',
      email: row?.email ?? '',
      photo_url: row?.photo_url ?? '',
      license_number: row?.license_number ?? '',
      license_expires_on: row?.license_expires_on?.slice(0, 10) ?? '',
      status: row?.status ?? 'active',
      assigned_bus_id: currentBus,
      pin: '',
      is_active: row?.is_active ?? true,
    },
  });

  const submit = handleSubmit(async (v) => {
    const body = { ...v, phone: normalizePhone(v.phone), assigned_bus_id: v.assigned_bus_id ? Number(v.assigned_bus_id) : null };
    if (!body.pin) delete body.pin;                        // vide = ne pas changer
    try {
      await save.mutateAsync({ id: row?.id, body });
      qc.invalidateQueries({ queryKey: ['buses'] });       // la liste des bus affiche le chauffeur attitré
      toast.success('Chauffeur enregistré.');
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

  const takenByOther = (b) => b.driver_id && Number(b.driver_id) !== Number(row?.id);
  const busLabel = (b) =>
    `${b.code} · ${b.plate_number} · ${BUS_TYPE[b.bus_type]?.label ?? b.bus_type} · ${b.seats} pl.`
    + (takenByOther(b) ? ` — attribué à ${b.driver_name}` : '')
    + (b.status === 'on_mission' ? ' — en mission' : '');

  return (
    <form onSubmit={submit} noValidate>
      <FormSection icon={UserRound} title="Identité">
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Photo</span>
            <Controller name="photo_url" control={control}
              render={({ field }) => <ImageUpload variant="avatar" value={field.value} onChange={field.onChange} folder="drivers" />} />
            {errors.photo_url && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.photo_url.message}</p>}
          </div>
          <FormGrid>
            <Field label="Prénom *" error={errors.first_name}>
              <input autoFocus {...register('first_name', { required: 'Champ requis' })} />
            </Field>
            <Field label="Nom *" error={errors.last_name}>
              <input {...register('last_name', { required: 'Champ requis' })} />
            </Field>
          </FormGrid>
        </div>
      </FormSection>

      <FormSection icon={Phone} title="Contact">
        <FormGrid>
          <Field label="Téléphone *" error={errors.phone} hint="8 chiffres : +216 est ajouté tout seul. Sinon, format international.">
            <span className="relative block">
              <Phone className={iconCls} />
              <input className="pl-10" inputMode="tel" placeholder="98 123 456" {...register('phone', {
                required: 'Champ requis',
                validate: (v) => /^\+[0-9]{8,15}$/.test(normalizePhone(v)) || 'Numéro invalide (ex. +21698123456)',
              })} />
            </span>
          </Field>
          <Field label="E-mail" error={errors.email}>
            <span className="relative block">
              <Mail className={iconCls} />
              <input className="pl-10" type="email" {...register('email', { pattern: { value: /^\S+@\S+\.\S+$/, message: 'E-mail invalide' } })} />
            </span>
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection icon={CreditCard} title="Permis de conduire" description="Une alerte vous prévient 30 jours avant l'échéance.">
        <FormGrid>
          <Field label="Numéro de permis *" error={errors.license_number}>
            <input {...register('license_number', { required: 'Champ requis' })} />
          </Field>
          <Field label="Fin de validité *" error={errors.license_expires_on}>
            <input type="date" {...register('license_expires_on', { required: 'Champ requis' })} />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection icon={Bus} title="Affectation">
        <div className="space-y-4">
          <Field label="Bus attribué" error={errors.assigned_bus_id} hint="Un bus ne peut avoir qu'un seul chauffeur attitré.">
            <select disabled={options.isLoading} {...register('assigned_bus_id')}>
              <option value="">Aucun bus</option>
              {(options.data?.buses ?? []).map((b) => (
                <option key={b.id} value={String(b.id)}
                        disabled={takenByOther(b) || (b.status === 'on_mission' && String(b.id) !== currentBus)}>
                  {busLabel(b)}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Statut</span>
            <RadioCards
              name="status"
              register={register}
              className="grid-cols-1 sm:grid-cols-3"
              options={Object.entries(DRIVER_STATUS).map(([value, s]) => ({ value, label: s.label, icon: s.icon, description: STATUS_HINT[value] }))}
            />
          </div>
        </div>
      </FormSection>

      <FormSection icon={KeyRound} title="Application chauffeur">
        <Field label={row?.has_pin ? 'Nouveau code PIN' : 'Code PIN'} error={errors.pin}
               hint={row?.has_pin ? 'Laissez vide pour conserver le code actuel.' : "Optionnel : 4 à 8 chiffres. Vous pourrez aussi en générer un depuis la liste."}>
          <input inputMode="numeric" autoComplete="off" {...register('pin', {
            validate: (v) => v === '' || /^\d{4,8}$/.test(v) || '4 à 8 chiffres',
          })} />
        </Field>
      </FormSection>

      <div className="mt-6 rounded-xl bg-slate-50 p-4">
        <Switch label="Chauffeur actif" description="Archiver un chauffeur libère son bus." {...register('is_active')} />
      </div>

      <FormActions>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="w-full sm:w-auto" loading={save.isPending}>Enregistrer</Button>
      </FormActions>
    </form>
  );
}