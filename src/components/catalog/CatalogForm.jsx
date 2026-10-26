import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Field from '@/components/ui/Field';
import ImageUpload from '@/components/ui/ImageUpload';
import { useToast } from '@/components/ui/Toast';
import { slugify } from '@/lib/format';

const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => String(v ?? '').trim() !== ''));

export default function CatalogForm({ row, resource, fields = [], i18nFields = [], imageFolder, nameLabel = 'Nom', onDone, onCancel }) {
  const toast = useToast();
  const save = resource.useSave();
  const isNew = !row;

  const {
    register, control, handleSubmit, watch, setValue, setError,
    formState: { errors, dirtyFields },
  } = useForm({
    defaultValues: {
      name: row?.name ?? '',
      slug: row?.slug ?? '',
      sort_order: String(row?.sort_order ?? 0),
      is_active: row?.is_active ?? true,
      ...Object.fromEntries(fields.map((f) => [f.name, row?.[f.name] ?? ''])),
      en: Object.fromEntries(i18nFields.map((f) => [f.name, row?.i18n?.en?.[f.name] ?? ''])),
    },
  });

  const name = watch('name');
  useEffect(() => {
    if (isNew && !dirtyFields.slug) setValue('slug', slugify(name).slice(0, 60));
  }, [name, isNew, dirtyFields.slug, setValue]);

  const rules = (f) => ({
    required: f.required ? 'Champ requis' : false,
    maxLength: f.max ? { value: f.max, message: `${f.max} caractères maximum` } : undefined,
  });

  const submit = handleSubmit(async (v) => {
    const en = compact(v.en);
    const body = {
      name: v.name,
      slug: v.slug,
      sort_order: Number(v.sort_order || 0),
      is_active: v.is_active,
      ...Object.fromEntries(fields.map((f) => [f.name, v[f.name]])),
      i18n: Object.keys(en).length ? { en } : {},
    };
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
        <Field label={`${nameLabel} *`} error={errors.name}>
          <input autoFocus {...register('name', { required: 'Champ requis', maxLength: { value: 120, message: '120 caractères maximum' } })} />
        </Field>
        <Field label="Slug (adresse web) *" error={errors.slug} hint="Minuscules, chiffres et tirets.">
          <input {...register('slug', { required: 'Champ requis', pattern: { value: /^[a-z0-9-]+$/, message: 'Minuscules, chiffres et tirets uniquement' } })} />
        </Field>

        {fields.map((f) => {
          if (f.type === 'image') {
            return (
              <div key={f.name} className="field span-2">
                <span className="field-label">{f.label}</span>
                <Controller name={f.name} control={control}
                  render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} folder={imageFolder} />} />
                {errors[f.name] && <small className="field-error">{errors[f.name].message}</small>}
              </div>
            );
          }
          return (
            <Field key={f.name} label={`${f.label}${f.required ? ' *' : ''}`} error={errors[f.name]}
                   className={f.type === 'textarea' || f.span === 2 ? 'span-2' : ''}>
              {f.type === 'select' ? (
                <select {...register(f.name, rules(f))}>
                  <option value="">Choisir…</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea rows="4" {...register(f.name, rules(f))} />
              ) : (
                <input {...register(f.name, rules(f))} />
              )}
            </Field>
          );
        })}

        <Field label="Ordre d'affichage" error={errors.sort_order} hint="Plus petit = affiché en premier (ou utilisez les flèches de la liste).">
          <input inputMode="numeric" {...register('sort_order', { pattern: { value: /^-?\d+$/, message: 'Nombre entier requis' } })} />
        </Field>
        <div className="field">
          <label className="chk" style={{ marginTop: 24 }}><input type="checkbox" {...register('is_active')} /> Publié sur le site</label>
        </div>
      </div>

      {i18nFields.length > 0 && (
        <>
          <h3 style={{ marginTop: 22 }}>Version anglaise <small className="muted">(optionnelle)</small></h3>
          <div className="form-grid">
            {i18nFields.map((f) => (
              <Field key={f.name} label={`${f.label} (EN)`} className={f.type === 'textarea' ? 'span-2' : ''}>
                {f.type === 'textarea'
                  ? <textarea rows="3" {...register(`en.${f.name}`)} />
                  : <input {...register(`en.${f.name}`)} />}
              </Field>
            ))}
          </div>
        </>
      )}

      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
        <button className="btn" disabled={save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}