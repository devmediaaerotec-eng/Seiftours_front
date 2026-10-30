import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowDown, ArrowUp, CalendarDays, Check, FileText, ImagePlus, Images, Info, Languages, Moon, Percent, Plane, Plus,
  Route, Save, Sparkles, Trash2, TriangleAlert, Wallet, X,
} from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Field from '@/components/ui/Field';
import { FormGrid, FormSection } from '@/components/ui/FormParts';
import ImageUpload, { IMAGE_ACCEPT, checkImage } from '@/components/ui/ImageUpload';
import RadioCards from '@/components/ui/RadioCards';
import Switch from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { addDays, assetUrl, fmtDate, slugify, tndToMillimes } from '@/lib/format';
import { uploadFile } from '@/lib/http';
import { emptyDay, emptyDeparture, toFormPath, tripSchema } from '../schema';

const TYPE_OPTIONS = {
  omra: { label: 'Omra', icon: Moon, description: 'Pèlerinage vers La Mecque et Médine' },
  organized: { label: 'Voyage organisé', icon: Plane, description: 'Séjour avec vol, hôtel et programme' },
  circuit: { label: 'Circuit', icon: Route, description: 'Itinéraire en Tunisie par région' },
};

const TABS = [
  { id: 'general', label: 'Général', icon: Info, fields: ['type', 'title', 'slug', 'destination_id', 'region_id', 'departure_city', 'duration_nights', 'summary', 'description', 'includes', 'excludes', 'image_url', 'sort_order', 'is_active', 'is_featured'] },
  { id: 'pricing', label: 'Tarifs et départs', icon: Wallet, fields: ['currency', 'price_from', 'old_price', 'departures'] },
  { id: 'program', label: 'Programme', icon: Route, fields: ['days'] },
  { id: 'gallery', label: 'Galerie', icon: Images, fields: ['images'] },
  { id: 'i18n', label: 'Anglais', icon: Languages, fields: ['en'] },
];

export default function TripForm({ defaultValues, options, isNew, allowedTypes, saving, onSubmit, onCancel }) {
  const confirm = useConfirm();
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
  const summary = watch('summary') ?? '';
  const nights = Number(watch('duration_nights')) || 0;
  const gallery = watch('images');
  const deps = watch('departures');
  const destinationId = watch('destination_id');
  const price = tndToMillimes(watch('price_from'));
  const oldPrice = tndToMillimes(watch('old_price'));
  const discount = Number.isFinite(price) && Number.isFinite(oldPrice) && price > 0 && oldPrice > price
    ? Math.round((1 - price / oldPrice) * 100) : null;

  const errTabs = TABS.filter((t) => t.fields.some((f) => errors[f]));
  const counts = { pricing: departures.fields.length, program: days.fields.length, gallery: images.fields.length };

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
    if (destinationId && !destinations.some((d) => String(d.id) === destinationId)) setValue('destination_id', '');
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
    for (const file of Array.from(fileList)) {            // un par un : plus léger pour le serveur
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
    if (value && nights > 0 && !getValues(`departures.${i}.return_date`)) setValue(`departures.${i}.return_date`, addDays(value, nights));
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

  const cancel = async () => {
    if (isDirty && !(await confirm({
      title: 'Quitter sans enregistrer', tone: 'primary', confirmLabel: 'Quitter',
      message: 'Vos modifications seront perdues. Voulez-vous vraiment quitter ce formulaire ?',
    }))) return;
    onCancel();
  };

  const iconBtn = 'rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <form onSubmit={submit} noValidate>
      {errTabs.length > 0 && (
        <Alert tone="bad" title="Certains champs sont invalides">
          À corriger dans : {errTabs.map((t) => t.label).join(', ')}.
        </Alert>
      )}

      {/* ---------------- Onglets ---------------- */}
      <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" className="flex w-max min-w-full gap-1 border-b border-slate-200">
          {TABS.map((t) => {
            const active = tab === t.id;
            const hasError = t.fields.some((f) => errors[f]);
            return (
              <button key={t.id} type="button" role="tab" aria-selected={active} onClick={() => setTab(t.id)}
                      className={cn('-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-medium transition',
                        active ? 'border-gold-500 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
                <t.icon className="size-4" />
                {t.label}
                {counts[t.id] > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{counts[t.id]}</span>}
                {hasError && <span className="size-2 rounded-full bg-red-500" aria-label="Erreur" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- GÉNÉRAL ---------------- */}
      <div hidden={tab !== 'general'}>
        <Card>
          <FormSection icon={Info} title="Informations principales">
            <div className="space-y-4">
              {allowedTypes.length > 1 ? (
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Type</span>
                  <RadioCards name="type" register={register} className="grid-cols-1 sm:grid-cols-2"
                              options={allowedTypes.map((value) => ({ value, ...TYPE_OPTIONS[value] }))} />
                </div>
              ) : <input type="hidden" {...register('type')} />}

              <FormGrid>
                <Field label="Titre *" error={errors.title}><input {...register('title')} /></Field>
                <Field label="Adresse web (slug) *" error={errors.slug} hint="Générée depuis le titre. Minuscules, chiffres et tirets.">
                  <input className="font-mono text-[13px]" {...register('slug')} />
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

                <Field label="Durée (nuits) *" error={errors.duration_nights}>
                  <input inputMode="numeric" {...register('duration_nights')} />
                </Field>
                <Field label="Ville de départ" error={errors.departure_city}><input {...register('departure_city')} /></Field>
              </FormGrid>
            </div>
          </FormSection>

          <FormSection icon={FileText} title="Description">
            <div className="space-y-4">
              <Field label="Résumé" error={errors.summary}
                     hint={<span className={summary.length > 500 ? 'font-medium text-red-600' : ''}>{summary.length}/500 caractères · affiché sur les cartes du site</span>}>
                <textarea rows="2" {...register('summary')} />
              </Field>
              <Field label="Description" error={errors.description}><textarea rows="7" {...register('description')} /></Field>
              <FormGrid>
                <Field label={<span className="inline-flex items-center gap-1.5"><Check className="size-4 text-emerald-600" />Inclus</span>} error={errors.includes} hint="Une ligne par élément.">
                  <textarea rows="6" {...register('includes')} />
                </Field>
                <Field label={<span className="inline-flex items-center gap-1.5"><X className="size-4 text-red-500" />Non inclus</span>} error={errors.excludes} hint="Une ligne par élément.">
                  <textarea rows="6" {...register('excludes')} />
                </Field>
              </FormGrid>
            </div>
          </FormSection>

          <FormSection icon={ImagePlus} title="Image de couverture" description="Affichée sur la carte du voyage et en tête de sa page.">
            <Controller name="image_url" control={control}
              render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} folder="trips" />} />
            {errors.image_url && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.image_url.message}</p>}
          </FormSection>

          <FormSection icon={Sparkles} title="Publication">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <Switch label="Publié sur le site" description="Décochez pour le masquer sans le supprimer." {...register('is_active')} />
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <Switch label="Mis en avant" description="Affiché en priorité sur la page d'accueil." {...register('is_featured')} />
              </div>
            </div>
            <div className="mt-4 max-w-xs">
              <Field label="Ordre d'affichage" error={errors.sort_order} hint="Plus petit = affiché en premier."><input inputMode="numeric" {...register('sort_order')} /></Field>
            </div>
          </FormSection>
        </Card>
      </div>

      {/* ---------------- TARIFS ET DÉPARTS ---------------- */}
      <div hidden={tab !== 'pricing'}>
        <Card>
          <FormSection icon={Wallet} title="Prix">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Devise" error={errors.currency}>
                <select {...register('currency')}><option value="TND">TND</option><option value="EUR">EUR</option><option value="USD">USD</option></select>
              </Field>
              <Field label="Prix « à partir de »" error={errors.price_from} hint="Vide : calculé depuis le départ actif le moins cher.">
                <input inputMode="decimal" {...register('price_from')} />
              </Field>
              <Field label="Ancien prix (barré)" error={errors.old_price}><input inputMode="decimal" {...register('old_price')} /></Field>
            </div>
            {discount != null && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <Percent className="size-3.5" /> Réduction affichée : −{discount} %
              </p>
            )}
          </FormSection>

          <FormSection icon={CalendarDays} title="Départs" description="Sans départ daté, le voyage est proposé sur devis.">
            <div className="space-y-4">
              {departures.fields.map((f, i) => {
                const e = errors.departures?.[i] ?? {};
                const d = deps?.[i];
                const total = Number(d?.seats_total);
                const left = d?.seats_left === '' ? total : Number(d?.seats_left);
                const pct = total > 0 && Number.isFinite(left) ? Math.max(0, Math.min(100, Math.round(((total - left) / total) * 100))) : null;
                return (
                  <div key={f.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><CalendarDays className="size-[18px]" /></span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{d?.departure_date ? fmtDate(d.departure_date) : `Départ n°${i + 1}`}</p>
                          <p className="text-xs text-slate-500">{total > 0 ? `${total - (Number.isFinite(left) ? left : 0)} réservée(s) sur ${total} places` : 'Places non limitées'}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Switch label="Actif" {...register(`departures.${i}.is_active`)} />
                        <button type="button" className={iconBtn} aria-label="Retirer ce départ" onClick={() => departures.remove(i)}><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                    {pct != null && (
                      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={cn('h-full rounded-full', pct >= 85 ? 'bg-amber-500' : 'bg-brand-500')} style={{ width: `${pct}%` }} /></div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Départ *" error={e.departure_date}>
                        <input type="date" {...register(`departures.${i}.departure_date`, { onChange: (ev) => onDepartureDate(i, ev.target.value) })} />
                      </Field>
                      <Field label="Retour" error={e.return_date}><input type="date" {...register(`departures.${i}.return_date`)} /></Field>
                      <Field label="Prix / personne *" error={e.price}><input inputMode="decimal" {...register(`departures.${i}.price`)} /></Field>
                      <Field label="Supplément single" error={e.single}><input inputMode="decimal" {...register(`departures.${i}.single`)} /></Field>
                      <Field label="Prix enfant" error={e.child}><input inputMode="decimal" {...register(`departures.${i}.child`)} /></Field>
                      <Field label="Places au total" error={e.seats_total}><input inputMode="numeric" {...register(`departures.${i}.seats_total`)} /></Field>
                      <Field label="Places restantes" error={e.seats_left}><input inputMode="numeric" {...register(`departures.${i}.seats_left`)} /></Field>
                    </div>
                  </div>
                );
              })}
              <Button variant="secondary" icon={Plus} onClick={() => departures.append(emptyDeparture())}>Ajouter un départ</Button>
            </div>
          </FormSection>
        </Card>
      </div>

      {/* ---------------- PROGRAMME ---------------- */}
      <div hidden={tab !== 'program'}>
        <Card>
          <FormSection icon={Route} title="Programme jour par jour" description="Affiché sous forme de calendrier dépliable sur la page du voyage.">
            <div className="space-y-4">
              {days.fields.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Aucun jour pour le moment.{nights > 0 && ` Générez ${nights + 1} jours d'un clic ou ajoutez-les un par un.`}
                </div>
              )}
              {days.fields.map((f, i) => (
                <div key={f.id} className="rounded-xl border border-slate-200 p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">{i + 1}</span>
                      <span className="text-sm font-semibold text-slate-900">Jour {i + 1}</span>
                    </span>
                    <span className="flex items-center">
                      <button type="button" className={iconBtn} disabled={i === 0} aria-label="Monter" onClick={() => days.move(i, i - 1)}><ArrowUp className="size-4" /></button>
                      <button type="button" className={iconBtn} disabled={i === days.fields.length - 1} aria-label="Descendre" onClick={() => days.move(i, i + 1)}><ArrowDown className="size-4" /></button>
                      <button type="button" className={iconBtn} aria-label="Retirer ce jour" onClick={() => days.remove(i)}><Trash2 className="size-4" /></button>
                    </span>
                  </div>
                  <div className="space-y-4">
                    <Field label="Titre *" error={errors.days?.[i]?.title}><input placeholder="Ex. Tunis → Istanbul" {...register(`days.${i}.title`)} /></Field>
                    <Field label="Description" error={errors.days?.[i]?.description}><textarea rows="3" {...register(`days.${i}.description`)} /></Field>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon={Plus} onClick={() => days.append(emptyDay())}>Ajouter un jour</Button>
                {days.fields.length === 0 && nights > 0 && (
                  <Button variant="secondary" icon={Sparkles} onClick={() => days.replace(Array.from({ length: nights + 1 }, emptyDay))}>Générer {nights + 1} jours</Button>
                )}
              </div>
            </div>
          </FormSection>
        </Card>
      </div>

      {/* ---------------- GALERIE ---------------- */}
      <div hidden={tab !== 'gallery'}>
        <Card>
          <FormSection icon={Images} title="Galerie photos" description="La couverture se règle dans l'onglet Général. Ajoutez ici les autres photos.">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Button variant="secondary" icon={ImagePlus} loading={uploading} onClick={() => galleryInput.current?.click()}>
                {uploading ? 'Envoi en cours…' : 'Ajouter des images'}
              </Button>
              <span className="text-xs text-slate-500">Sélection multiple · JPEG, PNG ou WebP · 8 Mo maximum chacune</span>
            </div>
            <input ref={galleryInput} type="file" accept={IMAGE_ACCEPT} multiple hidden onChange={(e) => addGalleryFiles(e.target.files)} />
            {galleryError && <Alert tone="bad">{galleryError}</Alert>}

            {images.fields.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">Aucune image dans la galerie.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {images.fields.map((f, i) => (
                  <div key={f.id} className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="relative aspect-video bg-slate-100">
                      <img src={assetUrl(gallery?.[i]?.url)} alt="" className="size-full object-cover" />
                      <span className="absolute left-2 top-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white">{i + 1}</span>
                    </div>
                    <div className="space-y-3 p-3">
                      <Field label="" error={errors.images?.[i]?.alt}><input placeholder="Texte alternatif (décrivez l'image)" {...register(`images.${i}.alt`)} /></Field>
                      <div className="flex items-center justify-between">
                        <span>
                          <button type="button" className={iconBtn} disabled={i === 0} aria-label="Monter" onClick={() => images.move(i, i - 1)}><ArrowUp className="size-4" /></button>
                          <button type="button" className={iconBtn} disabled={i === images.fields.length - 1} aria-label="Descendre" onClick={() => images.move(i, i + 1)}><ArrowDown className="size-4" /></button>
                        </span>
                        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50" onClick={() => images.remove(i)}>
                          <Trash2 className="size-4" /> Retirer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FormSection>
        </Card>
      </div>

      {/* ---------------- ANGLAIS ---------------- */}
      <div hidden={tab !== 'i18n'}>
        <Card>
          <Alert tone="info">Laissez un champ vide pour afficher le texte français sur la version anglaise du site.</Alert>
          <FormSection icon={Languages} title="Textes en anglais">
            <div className="space-y-4">
              <Field label="Titre (EN)"><input {...register('en.title')} /></Field>
              <Field label="Résumé (EN)"><textarea rows="2" {...register('en.summary')} /></Field>
              <Field label="Description (EN)"><textarea rows="5" {...register('en.description')} /></Field>
              <FormGrid>
                <Field label="Inclus (EN)"><textarea rows="5" {...register('en.includes')} /></Field>
                <Field label="Non inclus (EN)"><textarea rows="5" {...register('en.excludes')} /></Field>
              </FormGrid>
            </div>
          </FormSection>

          {days.fields.length > 0 && (
            <FormSection icon={Route} title="Programme (EN)">
              <div className="space-y-4">
                {days.fields.map((f, i) => (
                  <div key={f.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-900">Jour {i + 1} <span className="font-normal text-slate-500">— {watch(`days.${i}.title`)}</span></p>
                    <FormGrid>
                      <Field label="Titre (EN)"><input {...register(`days.${i}.en_title`)} /></Field>
                      <Field label="Description (EN)"><textarea rows="2" {...register(`days.${i}.en_description`)} /></Field>
                    </FormGrid>
                  </div>
                ))}
              </div>
            </FormSection>
          )}
        </Card>
      </div>

      {/* ---------------- Barre d'actions ---------------- */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-slate-200 bg-white/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <p className={cn('hidden items-center gap-2 text-sm sm:flex', isDirty ? 'text-amber-700' : 'text-slate-400')}>
            {isDirty
              ? <><TriangleAlert className="size-4" /> Modifications non enregistrées</>
              : <><Check className="size-4" /> Tout est enregistré</>}
          </p>
          <div className="flex flex-1 gap-2 sm:flex-none">
            <Button variant="secondary" className="flex-1 sm:flex-none" onClick={cancel}>Annuler</Button>
            <Button type="submit" icon={Save} className="flex-1 sm:flex-none" loading={saving}>Enregistrer</Button>
          </div>
        </div>
      </div>
    </form>
  );
}