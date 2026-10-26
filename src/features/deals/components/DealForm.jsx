import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Field from '@/components/ui/Field';
import ImageUpload from '@/components/ui/ImageUpload';
import HotelPicker from './HotelPicker';
import { dealSchema, toFormPath } from '../schema';

const TRIP_TYPES = { omra: 'Omra', organized: 'Voyage organisé', circuit: 'Circuit' };

export default function DealForm({ defaultValues, options, saving, onSubmit, extraActions }) {
  const {
    register, control, handleSubmit, watch, setValue, setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(dealSchema), defaultValues, mode: 'onTouched' });

  const target = watch('target');
  const hotelId = watch('hotel_id');
  const hotelLabel = watch('hotel_label');

  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const submit = handleSubmit(async (values) => {
    const result = await onSubmit(values);
    if (result?.violations) {
      Object.entries(result.violations).forEach(([p, m]) => setError(toFormPath(p), { type: 'server', message: m }));
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <div className="card">
        <h3>Offre</h3>
        <div className="form-grid">
          <Field label="Catégorie *" error={errors.category_id}>
            <select {...register('category_id')}>
              <option value="">Choisir…</option>
              {options.categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}{c.is_active ? '' : ' (masquée)'}</option>
              ))}
            </select>
          </Field>
          <Field label="Texte de réduction" error={errors.discount_text} hint="Ex. -30 %, 2e nuit offerte">
            <input {...register('discount_text')} />
          </Field>
          <Field label="Titre *" className="span-2" error={errors.title}>
            <input {...register('title')} />
          </Field>
          <Field label="Description" className="span-2" error={errors.description} hint="500 caractères maximum.">
            <textarea rows="3" {...register('description')} />
          </Field>
          <div className="field span-2">
            <span className="field-label">Image</span>
            <Controller name="image_url" control={control}
              render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} folder="deals" />} />
            {errors.image_url && <small className="field-error">{errors.image_url.message}</small>}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Offre sur…</h3>
        <div className="radio-row">
          <label><input type="radio" value="trip" {...register('target')} /> Un voyage / circuit</label>
          <label><input type="radio" value="hotel" {...register('target')} /> Un hôtel</label>
        </div>
        {errors.target && <small className="field-error">{errors.target.message}</small>}

        {target === 'trip' ? (
          <Field label="Voyage *" error={errors.trip_id}>
            <select {...register('trip_id')}>
              <option value="">Choisir…</option>
              {options.trips.map((t) => (
                <option key={t.id} value={String(t.id)}>{t.title} ({TRIP_TYPES[t.type]})</option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="field">
            <span className="field-label">Hôtel *</span>
            <HotelPicker
              id={hotelId}
              label={hotelLabel}
              error={errors.hotel_id}
              onPick={({ id, label }) => {
                setValue('hotel_id', id, { shouldDirty: true, shouldValidate: true });
                setValue('hotel_label', label, { shouldDirty: true });
              }}
              onClear={() => {
                setValue('hotel_id', '', { shouldDirty: true });
                setValue('hotel_label', '', { shouldDirty: true });
              }}
            />
          </div>
        )}
      </div>

      <div className="card">
        <h3>Prix et validité</h3>
        <div className="form-grid cols-3">
          <Field label="Devise" error={errors.currency}>
            <select {...register('currency')}>
              <option value="TND">TND</option><option value="EUR">EUR</option><option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Prix de l'offre" error={errors.price} hint="Vide : seule la réduction est affichée.">
            <input inputMode="decimal" {...register('price')} />
          </Field>
          <Field label="Ancien prix (barré)" error={errors.old_price}>
            <input inputMode="decimal" {...register('old_price')} />
          </Field>
          <Field label="Valable à partir du" error={errors.valid_from}>
            <input type="date" {...register('valid_from')} />
          </Field>
          <Field label="Valable jusqu'au" error={errors.valid_until} hint="Vide : sans limite de date.">
            <input type="date" {...register('valid_until')} />
          </Field>
          <Field label="Ordre d'affichage" error={errors.sort_order}>
            <input inputMode="numeric" {...register('sort_order')} />
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="chk"><input type="checkbox" {...register('is_active')} /> Publiée sur le site</label>
          <label className="chk"><input type="checkbox" {...register('is_featured')} /> Mise en avant (page d'accueil)</label>
        </div>
      </div>

      <div className="card">
        <h3>Version anglaise <small className="muted">(optionnelle)</small></h3>
        <div className="form-grid">
          <Field label="Titre (EN)" className="span-2"><input {...register('en.title')} /></Field>
          <Field label="Description (EN)" className="span-2"><textarea rows="3" {...register('en.description')} /></Field>
          <Field label="Texte de réduction (EN)"><input {...register('en.discount_text')} /></Field>
        </div>
      </div>

      <div className="form-actions">
        {extraActions}
        <button className="btn" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}