import { useForm } from 'react-hook-form';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { branches } from './resource';

const DAYS = { 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi', 0: 'Dimanche' };
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_HOURS = ORDER.map((day) => ({
  day, open: day >= 1 && day <= 6, from: '08:30', to: day === 6 ? '13:00' : '17:30',
}));

export default function BranchForm({ row, onDone, onCancel }) {
  const toast = useToast();
  const save = branches.useSave();

  const { register, handleSubmit, watch, getValues, setError, formState: { errors } } = useForm({
    defaultValues: {
      code: row?.code ?? '', name: row?.name ?? '', city: row?.city ?? '', address: row?.address ?? '',
      phone: row?.phone ?? '', email: row?.email ?? '', maps_url: row?.maps_url ?? '', is_active: row?.is_active ?? true,
      hours: (row?.opening_hours ?? DEFAULT_HOURS).map((h) => ({ day: h.day, open: h.open, from: h.from ?? '08:30', to: h.to ?? '17:30' })),
    },
  });
  const hours = watch('hours');

  const submit = handleSubmit(async (v) => {
    const body = {
      ...v,
      opening_hours: v.hours.map((h) => ({ day: h.day, open: h.open, from: h.open ? h.from : null, to: h.open ? h.to : null })),
    };
    delete body.hours;
    try {
      await save.mutateAsync({ id: row?.id, body });
      toast.success('Agence enregistrée.');
      onDone();
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        Object.entries(e.data.violations).forEach(([k, m]) => {
          const m2 = k.match(/^opening_hours\.(\d+)$/);
          setError(m2 ? `hours.${m2[1]}.to` : k, { type: 'server', message: m });
        });
        toast.error('Certains champs sont invalides.');
      } else toast.error(e.message);
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        <Field label="Nom *" error={errors.name}><input autoFocus {...register('name', { required: 'Champ requis' })} /></Field>
        <Field label="Code *" error={errors.code} hint={row ? 'Le code ne peut plus être modifié.' : 'Minuscules, chiffres, tirets. Ex. sousse'}>
          <input disabled={!!row} {...register('code', row ? {} : { required: 'Champ requis', pattern: { value: /^[a-z0-9_-]{2,40}$/, message: 'Minuscules, chiffres et tirets (2 à 40)' } })} />
        </Field>
        <Field label="Ville *" error={errors.city}><input {...register('city', { required: 'Champ requis' })} /></Field>
        <Field label="Téléphone" error={errors.phone}>
          <input inputMode="tel" {...register('phone', { validate: (v) => v === '' || /^[+0-9 ().-]{6,30}$/.test(v) || 'Numéro invalide' })} />
        </Field>
        <Field label="Adresse *" className="span-2" error={errors.address}><input {...register('address', { required: 'Champ requis' })} /></Field>
        <Field label="E-mail" error={errors.email}>
          <input type="email" {...register('email', { validate: (v) => v === '' || /^\S+@\S+\.\S+$/.test(v) || 'E-mail invalide' })} />
        </Field>
        <Field label="Lien Google Maps" error={errors.maps_url}>
          <input placeholder="https://maps.google.com/…" {...register('maps_url', { validate: (v) => v === '' || /^https?:\/\//i.test(v) || 'Le lien doit commencer par http(s)://' })} />
        </Field>
      </div>

      <h4 className="form-section">Horaires d'ouverture</h4>
      <div className="hours">
        {hours.map((h, i) => (
          <div className="hours-row" key={h.day}>
            <label className="chk"><input type="checkbox" {...register(`hours.${i}.open`)} /> {DAYS[h.day]}</label>
            {h.open ? (
              <div className="hours-times">
                <input type="time" {...register(`hours.${i}.from`, { required: 'Requis' })} />
                <span>à</span>
                <input type="time" {...register(`hours.${i}.to`, {
                  required: 'Requis',
                  validate: (v) => v > getValues(`hours.${i}.from`) || "La fermeture doit suivre l'ouverture",
                })} />
                {(errors.hours?.[i]?.to || errors.hours?.[i]?.from) && <small className="field-error">{(errors.hours[i].to || errors.hours[i].from).message}</small>}
              </div>
            ) : <span className="muted">Fermé</span>}
          </div>
        ))}
      </div>

      <label className="chk" style={{ marginTop: 14 }}><input type="checkbox" {...register('is_active')} /> Agence active (visible pour les réservations)</label>

      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
        <button className="btn" disabled={save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}