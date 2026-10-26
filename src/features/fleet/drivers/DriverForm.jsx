import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import Field from '@/components/ui/Field';
import ImageUpload from '@/components/ui/ImageUpload';
import { useToast } from '@/components/ui/Toast';
import { BUS_TYPE, DRIVER_STATUS } from '../shared/status';
import { drivers, useDriverFormOptions } from './resource';

// 98123456 -> +21698123456 ; espaces et points retirés
const normalizePhone = (s) => {
  const t = s.replace(/[\s.\-()]/g, '');
  return /^\d{8}$/.test(t) ? `+216${t}` : t;
};

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
    const body = {
      ...v,
      phone: normalizePhone(v.phone),
      assigned_bus_id: v.assigned_bus_id ? Number(v.assigned_bus_id) : null,
    };
    if (!body.pin) delete body.pin;                        // vide = ne pas changer
    try {
      await save.mutateAsync({ id: row?.id, body });
      qc.invalidateQueries({ queryKey: ['buses'] });       // la liste des bus affiche le chauffeur attitré
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

  const takenByOther = (b) => b.driver_id && Number(b.driver_id) !== Number(row?.id);
  const busLabel = (b) =>
    `${b.code} · ${b.plate_number} · ${BUS_TYPE[b.bus_type]?.label ?? b.bus_type} · ${b.seats} places`
    + (takenByOther(b) ? ` — attribué à ${b.driver_name}` : '')
    + (b.status === 'on_mission' ? ' — en mission' : '');

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        <div className="field span-2">
          <span className="field-label">Photo</span>
          <Controller name="photo_url" control={control}
            render={({ field }) => <ImageUpload variant="avatar" value={field.value} onChange={field.onChange} folder="drivers" />} />
          {errors.photo_url && <small className="field-error">{errors.photo_url.message}</small>}
        </div>

        <Field label="Prénom *" error={errors.first_name}>
          <input autoFocus {...register('first_name', { required: 'Champ requis' })} />
        </Field>
        <Field label="Nom *" error={errors.last_name}>
          <input {...register('last_name', { required: 'Champ requis' })} />
        </Field>
        <Field label="Téléphone *" error={errors.phone} hint="8 chiffres : +216 ajouté automatiquement. Sinon format international.">
          <input inputMode="tel" placeholder="98 123 456" {...register('phone', {
            required: 'Champ requis',
            validate: (v) => /^\+[0-9]{8,15}$/.test(normalizePhone(v)) || 'Numéro invalide (ex. +21698123456)',
          })} />
        </Field>
        <Field label="E-mail" error={errors.email}>
          <input type="email" {...register('email', { pattern: { value: /^\S+@\S+\.\S+$/, message: 'E-mail invalide' } })} />
        </Field>
        <Field label="N° de permis *" error={errors.license_number}>
          <input {...register('license_number', { required: 'Champ requis' })} />
        </Field>
        <Field label="Fin de validité du permis *" error={errors.license_expires_on}>
          <input type="date" {...register('license_expires_on', { required: 'Champ requis' })} />
        </Field>

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
        <Field label="Statut" error={errors.status}>
          <select {...register('status')}>
            {Object.entries(DRIVER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>

        <Field label={row?.has_pin ? 'Nouveau code PIN' : 'Code PIN'} error={errors.pin}
               hint={row?.has_pin ? 'Laissez vide pour conserver le code actuel.' : "Optionnel : 4 à 8 chiffres, pour l'application chauffeur. Vous pourrez en générer un depuis la liste."}>
          <input inputMode="numeric" autoComplete="off" {...register('pin', {
            validate: (v) => v === '' || /^\d{4,8}$/.test(v) || '4 à 8 chiffres',
          })} />
        </Field>
        <div className="field">
          <label className="chk"><input type="checkbox" {...register('is_active')} /> Chauffeur actif</label>
          <small className="muted">Archiver un chauffeur libère son bus.</small>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
        <button className="btn" disabled={save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}