import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react';
import Field from '@/components/ui/Field';
import ImageUpload, { IMAGE_ACCEPT, checkImage } from '@/components/ui/ImageUpload';
import { uploadFile } from '@/lib/http';
import { addDays, assetUrl, slugify } from '@/lib/format';
import { emptyDay, emptyDeparture, toFormPath, tripSchema } from '../schema';

const TYPE_LABELS = { omra: 'Omra', organized: 'Voyage organisé', circuit: 'Circuit' };

const TABS = [
  { id: 'general', label: 'Général', fields: ['type', 'title', 'slug', 'destination_id', 'region_id', 'departure_city', 'duration_nights', 'summary', 'description', 'includes', 'excludes', 'image_url', 'sort_order', 'is_active', 'is_featured'] },
  { id: 'pricing', label: 'Tarifs et départs', fields: ['currency', 'price_from', 'old_price', 'departures'] },
  { id: 'program', label: 'Programme', fields: ['days'] },
  { id: 'gallery', label: 'Galerie', fields: ['images'] },
  { id: 'i18n',    label: 'Traductions (EN)', fields: ['en'] },
];

export default function TripForm({ defaultValues, options, isNew, allowedTypes, saving, onSubmit, extraActions }) {
  // ---- Tous les hooks restent À L'INTÉRIEUR de cette fonction ----
  const {
    register, control, handleSubmit, watch, setValue, getValues, setError,
    formState: { errors, isDirty, dirtyFields },
  } = useForm({ resolver: zodResolver(tripSchema), defaultValues, mode: 'onTouched' });

  const [tab, setTab] = useState('general');
  const galleryInput = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [galleryError, setGalleryError] = useState('');

  const days = useFieldArray({ control, name: 'days' });
  const images = useFieldArray({ control, name: 'images' });
  const departures = useFieldArray({ control, name: 'departures' });

  const type = watch('type');
  const title = watch('title');
  const nights = Number(watch('duration_nights')) || 0;
  const gallery = watch('images');
  const destinationId = watch('destination_id');

  // Slug généré depuis le titre tant qu'on ne l'a pas modifié à la main
  useEffect(() => {
    if (isNew && !dirtyFields.slug) setValue('slug', slugify(title));
  }, [title, isNew, dirtyFields.slug, setValue]);

  // Destinations compatibles avec le type choisi
  const destinations = useMemo(
    () => (options.destinations ?? []).filter((d) => (type === 'omra' ? d.kind === 'omra' : d.kind !== 'omra')),
    [options, type]
  );
  useEffect(() => {
    if (destinationId && !destinations.some((d) => String(d.id) === destinationId)) {
      setValue('destination_id', '');
    }
  }, [destinations, destinationId, setValue]);

  // Avertit avant de quitter la page avec des modifications non enregistrées
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const addGalleryFiles = async (fileList) => {
    setGalleryError('');
    setUploading(true);
    const problems = [];
    for (const file of Array.from(fileList)) {          // un par un : plus léger pour le serveur
      const bad = checkImage(file);
      if (bad) { problems.push(`${file.name} : ${bad}`); continue; }
      try {
        const { url } = await uploadFile('/admin/uploads', file, { folder: 'trips' });
        images.append({ url, alt: '' });
      } catch (e) {
        problems.push(`${file.name} : ${e.message}`);
      }
    }
    setUploading(false);
    setGalleryError(problems.join(' · '));
    if (galleryInput.current) galleryInput.current.value = '';
  };

  const onDepartureDate = (i, value) => {
    if (value && nights > 0 && !getValues(`departures.${i}.return_date`)) {
      setValue(`departures.${i}.return_date`, addDays(value, nights));
    }
  };

  const onInvalid = (errs) => {
    const first = TABS.find((t) => t.fields.some((f) => errs[f]));
    if (first) setTab(first.id);
  };

  const submit = handleSubmit(async (values) => {
    const result = await onSubmit(values);
    if (result?.violations) {
      const paths = Object.entries(result.violations).map(([p, message]) => {
        const fp = toFormPath(p);
        setError(fp, { type: 'server', message });
        return fp.split('.')[0];
      });
      const first = TABS.find((t) => paths.some((p) => t.fields.includes(p)));
      if (first) setTab(first.id);
    }
  }, onInvalid);

  return (
    <form onSubmit={submit} noValidate>
      <div className="tabs">
        {TABS.map((t) => (
          <button type="button" key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.fields.some((f) => errors[f]) && <span className="dot" />}
          </button>
        ))}
      </div>

      <div className="card">
        {/* ---------------- GÉNÉRAL ---------------- */}
        <div hidden={tab !== 'general'} className="form-grid">
          <Field label="Type" error={errors.type}>
            <select {...register('type')}>
              {allowedTypes.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </Field>
          <Field label="Titre *" error={errors.title}>
            <input {...register('title')} />
          </Field>
          <Field label="Adresse web (slug) *" error={errors.slug} hint="Généré depuis le titre. Minuscules, chiffres et tirets.">
            <input {...register('slug')} />
          </Field>

          {type === 'circuit' ? (
            <Field label="Région *" error={errors.region_id}>
              <select {...register('region_id')}>
                <option value="">Choisir…</option>
                {(options.regions ?? []).map((r) => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Destination *" error={errors.destination_id}>
              <select {...register('destination_id')}>
                <option value="">Choisir…</option>
                {destinations.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              </select>
            </Field>
          )}

          <Field label="Ville de départ" error={errors.departure_city}>
            <input {...register('departure_city')} />
          </Field>
          <Field label="Durée (nuits) *" error={errors.duration_nights}>
            <input inputMode="numeric" {...register('duration_nights')} />
          </Field>

          <Field label="Résumé" className="span-2" error={errors.summary} hint="500 caractères maximum, affiché sur les cartes du site.">
            <textarea rows="2" {...register('summary')} />
          </Field>
          <Field label="Description" className="span-2" error={errors.description}>
            <textarea rows="8" {...register('description')} />
          </Field>
          <Field label="Inclus" error={errors.includes} hint="Une ligne par élément.">
            <textarea rows="6" {...register('includes')} />
          </Field>
          <Field label="Non inclus" error={errors.excludes} hint="Une ligne par élément.">
            <textarea rows="6" {...register('excludes')} />
          </Field>

          <div className="field span-2">
            <span className="field-label">Image de couverture</span>
            <Controller
              name="image_url"
              control={control}
              render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} folder="trips" />}
            />
            {errors.image_url && <small className="field-error">{errors.image_url.message}</small>}
          </div>

          <Field label="Ordre d'affichage" error={errors.sort_order} hint="Plus petit = affiché en premier.">
            <input inputMode="numeric" {...register('sort_order')} />
          </Field>
          <div className="field">
            <label className="chk"><input type="checkbox" {...register('is_active')} /> Publié sur le site</label>
            <label className="chk"><input type="checkbox" {...register('is_featured')} /> Mis en avant</label>
          </div>
        </div>

        {/* ---------------- TARIFS ET DÉPARTS ---------------- */}
        <div hidden={tab !== 'pricing'}>
          <div className="form-grid cols-3">
            <Field label="Devise" error={errors.currency}>
              <select {...register('currency')}>
                <option value="TND">TND</option><option value="EUR">EUR</option><option value="USD">USD</option>
              </select>
            </Field>
            <Field label="Prix « à partir de »" error={errors.price_from} hint="Vide : calculé depuis le départ actif le moins cher.">
              <input inputMode="decimal" {...register('price_from')} />
            </Field>
            <Field label="Ancien prix (barré)" error={errors.old_price}>
              <input inputMode="decimal" {...register('old_price')} />
            </Field>
          </div>

          <h3 style={{ marginTop: 20 }}>Départs</h3>
          {departures.fields.length === 0 && <p className="muted">Aucun départ daté. Le voyage sera proposé sur devis.</p>}
          {departures.fields.map((f, i) => {
            const e = errors.departures?.[i] ?? {};
            return (
              <div className="row-card" key={f.id}>
                <div className="form-grid cols-4">
                  <Field label="Départ *" error={e.departure_date}>
                    <input type="date" {...register(`departures.${i}.departure_date`, { onChange: (ev) => onDepartureDate(i, ev.target.value) })} />
                  </Field>
                  <Field label="Retour" error={e.return_date}>
                    <input type="date" {...register(`departures.${i}.return_date`)} />
                  </Field>
                  <Field label="Prix / personne *" error={e.price}>
                    <input inputMode="decimal" {...register(`departures.${i}.price`)} />
                  </Field>
                  <Field label="Supplément single" error={e.single}>
                    <input inputMode="decimal" {...register(`departures.${i}.single`)} />
                  </Field>
                  <Field label="Prix enfant" error={e.child}>
                    <input inputMode="decimal" {...register(`departures.${i}.child`)} />
                  </Field>
                  <Field label="Places au total" error={e.seats_total}>
                    <input inputMode="numeric" {...register(`departures.${i}.seats_total`)} />
                  </Field>
                  <Field label="Places restantes" error={e.seats_left}>
                    <input inputMode="numeric" {...register(`departures.${i}.seats_left`)} />
                  </Field>
                  <div className="field">
                    <label className="chk"><input type="checkbox" {...register(`departures.${i}.is_active`)} /> Actif</label>
                  </div>
                </div>
                <button type="button" className="btn ghost sm" onClick={() => departures.remove(i)}>
                  <Trash2 size={14} /> Retirer ce départ
                </button>
              </div>
            );
          })}
          <button type="button" className="btn ghost" onClick={() => departures.append(emptyDeparture())}>
            <Plus size={14} /> Ajouter un départ
          </button>
        </div>

        {/* ---------------- PROGRAMME ---------------- */}
        <div hidden={tab !== 'program'}>
          {days.fields.length === 0 && <p className="muted">Décrivez le programme jour par jour.</p>}
          {days.fields.map((f, i) => (
            <div className="row-card" key={f.id}>
              <div className="row-head">
                <strong>Jour {i + 1}</strong>
                <div className="row-tools">
                  <button type="button" className="btn ghost sm" disabled={i === 0} onClick={() => days.move(i, i - 1)} aria-label="Monter"><ArrowUp size={14} /></button>
                  <button type="button" className="btn ghost sm" disabled={i === days.fields.length - 1} onClick={() => days.move(i, i + 1)} aria-label="Descendre"><ArrowDown size={14} /></button>
                  <button type="button" className="btn ghost sm" onClick={() => days.remove(i)} aria-label="Retirer"><Trash2 size={14} /></button>
                </div>
              </div>
              <Field label="Titre *" error={errors.days?.[i]?.title}>
                <input {...register(`days.${i}.title`)} />
              </Field>
              <Field label="Description" error={errors.days?.[i]?.description}>
                <textarea rows="3" {...register(`days.${i}.description`)} />
              </Field>
            </div>
          ))}
          <div className="row-tools">
            <button type="button" className="btn ghost" onClick={() => days.append(emptyDay())}><Plus size={14} /> Ajouter un jour</button>
            {days.fields.length === 0 && nights > 0 && (
              <button type="button" className="btn ghost" onClick={() => days.replace(Array.from({ length: nights + 1 }, emptyDay))}>
                Générer {nights + 1} jours
              </button>
            )}
          </div>
        </div>

        {/* ---------------- GALERIE ---------------- */}
        <div hidden={tab !== 'gallery'}>
          <div className="row-tools" style={{ marginBottom: 12 }}>
            <button type="button" className="btn ghost" disabled={uploading} onClick={() => galleryInput.current?.click()}>
              <ImagePlus size={16} /> {uploading ? 'Envoi en cours…' : 'Ajouter des images'}
            </button>
            <small className="muted">Sélection multiple possible · JPEG, PNG ou WebP · 8 Mo maximum chacune</small>
          </div>
          <input ref={galleryInput} type="file" accept={IMAGE_ACCEPT} multiple hidden
                 onChange={(e) => addGalleryFiles(e.target.files)} />
          {galleryError && <div className="alert bad">{galleryError}</div>}

          {images.fields.length === 0 && <p className="muted">Aucune image. La couverture se règle dans l'onglet Général.</p>}
          <div className="gallery-list">
            {images.fields.map((f, i) => (
              <div className="gallery-item" key={f.id}>
                <img src={assetUrl(gallery?.[i]?.url)} alt="" />
                <div className="gallery-fields">
                  <Field label="Texte alternatif" error={errors.images?.[i]?.alt}>
                    <input placeholder="Décrivez l'image" {...register(`images.${i}.alt`)} />
                  </Field>
                  <div className="row-tools">
                    <button type="button" className="btn ghost sm" disabled={i === 0} onClick={() => images.move(i, i - 1)} aria-label="Monter"><ArrowUp size={14} /></button>
                    <button type="button" className="btn ghost sm" disabled={i === images.fields.length - 1} onClick={() => images.move(i, i + 1)} aria-label="Descendre"><ArrowDown size={14} /></button>
                    <button type="button" className="btn ghost sm" onClick={() => images.remove(i)}><Trash2 size={14} /> Retirer</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- TRADUCTIONS ---------------- */}
        <div hidden={tab !== 'i18n'}>
          <p className="muted">Laissez vide pour afficher le texte français sur la version anglaise du site.</p>
          <div className="form-grid">
            <Field label="Titre (EN)" className="span-2"><input {...register('en.title')} /></Field>
            <Field label="Résumé (EN)" className="span-2"><textarea rows="2" {...register('en.summary')} /></Field>
            <Field label="Description (EN)" className="span-2"><textarea rows="6" {...register('en.description')} /></Field>
            <Field label="Inclus (EN)"><textarea rows="5" {...register('en.includes')} /></Field>
            <Field label="Non inclus (EN)"><textarea rows="5" {...register('en.excludes')} /></Field>
          </div>
          {days.fields.length > 0 && <h3 style={{ marginTop: 20 }}>Programme (EN)</h3>}
          {days.fields.map((f, i) => (
            <div className="row-card" key={f.id}>
              <strong>Jour {i + 1}</strong> <span className="muted">— {watch(`days.${i}.title`)}</span>
              <div className="form-grid" style={{ marginTop: 10 }}>
                <Field label="Titre (EN)"><input {...register(`days.${i}.en_title`)} /></Field>
                <Field label="Description (EN)"><textarea rows="2" {...register(`days.${i}.en_description`)} /></Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="form-actions">
        {extraActions}
        <button className="btn" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}