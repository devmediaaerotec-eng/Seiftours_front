import { z } from 'zod';
import { millimesToTnd, tndToMillimes } from '@/lib/format';

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const moneyRe = /^\d+([.,]\d{1,3})?$/;
const MONEY_MSG = 'Montant invalide (ex. 1450 ou 1450.500)';

const money    = z.string().trim().regex(moneyRe, MONEY_MSG);
const moneyOpt = z.string().trim().refine((v) => v === '' || moneyRe.test(v), MONEY_MSG);
const intOpt   = z.string().trim().refine((v) => v === '' || /^\d+$/.test(v), 'Nombre entier requis');

const departure = z.object({
  dbId: z.number().nullable(),
  departure_date: z.string().regex(dateRe, 'Date requise'),
  return_date: z.string().refine((v) => v === '' || dateRe.test(v), 'Date invalide'),
  price: money,
  single: moneyOpt,
  child: moneyOpt,
  seats_total: intOpt,
  seats_left: intOpt,
  is_active: z.boolean(),
});

const day = z.object({
  title: z.string().trim().min(1, 'Titre du jour requis').max(190),
  description: z.string(),
  en_title: z.string(),
  en_description: z.string(),
});

const image = z.object({
  url: z.string().trim().min(1, "URL de l'image requise").max(500),
  alt: z.string().max(190),
});

export const tripSchema = z.object({
  type: z.enum(['omra', 'organized', 'circuit']),
  title: z.string().trim().min(1, 'Titre requis').max(190),
  slug: z.string().trim().min(1, 'Slug requis').max(140)
    .regex(/^[a-z0-9-]+$/, 'Minuscules, chiffres et tirets uniquement'),
  destination_id: z.string(),
  region_id: z.string(),
  summary: z.string().max(500, '500 caractères maximum'),
  description: z.string(),
  departure_city: z.string().max(80),
  duration_nights: z.string().regex(/^\d+$/, 'Nombre entier requis')
    .refine((v) => Number(v) >= 1 && Number(v) <= 365, 'Entre 1 et 365 nuits'),
  price_from: moneyOpt,
  old_price: moneyOpt,
  currency: z.enum(['TND', 'EUR', 'USD']),
  includes: z.string(),
  excludes: z.string(),
  image_url: z.string().max(500),
  is_featured: z.boolean(),
  is_active: z.boolean(),
  sort_order: intOpt,
  en: z.object({
    title: z.string(), summary: z.string(), description: z.string(),
    includes: z.string(), excludes: z.string(),
  }),
  days: z.array(day),
  images: z.array(image),
  departures: z.array(departure),
}).superRefine((v, ctx) => {
  const issue = (path, message) => ctx.addIssue({ code: 'custom', path, message });

  if (v.type === 'circuit') {
    if (!v.region_id) issue(['region_id'], 'Choisissez une région');
  } else if (!v.destination_id) {
    issue(['destination_id'], 'Choisissez une destination');
  }

  const p = tndToMillimes(v.price_from);
  const o = tndToMillimes(v.old_price);
  if (p != null && o != null && o <= p) issue(['old_price'], "L'ancien prix doit être supérieur au prix actuel");

  const seen = new Set();
  v.departures.forEach((d, i) => {
    if (d.return_date && d.return_date < d.departure_date) issue(['departures', i, 'return_date'], 'Le retour doit être après le départ');
    if (seen.has(d.departure_date)) issue(['departures', i, 'departure_date'], 'Date de départ en double');
    seen.add(d.departure_date);
    if (d.seats_total !== '' && d.seats_left !== '' && Number(d.seats_left) > Number(d.seats_total)) {
      issue(['departures', i, 'seats_left'], 'Plus de places restantes que de places au total');
    }
  });
});

export const emptyDay = () => ({ title: '', description: '', en_title: '', en_description: '' });
export const emptyImage = () => ({ url: '', alt: '' });
export const emptyDeparture = () => ({
  dbId: null, departure_date: '', return_date: '', price: '', single: '', child: '',
  seats_total: '', seats_left: '', is_active: true,
});

export const emptyTrip = (type = 'organized') => ({
  type, title: '', slug: '', destination_id: '', region_id: '', summary: '', description: '',
  departure_city: 'Tunis', duration_nights: '', price_from: '', old_price: '', currency: 'TND',
  includes: '', excludes: '', image_url: '', is_featured: false, is_active: true, sort_order: '0',
  en: { title: '', summary: '', description: '', includes: '', excludes: '' },
  days: [], images: [], departures: [],
});

/** Réponse API  ->  valeurs du formulaire */
export function toForm({ trip, days, images, departures }) {
  const en = trip.i18n?.en ?? {};
  return {
    type: trip.type,
    title: trip.title,
    slug: trip.slug,
    destination_id: trip.destination_id ? String(trip.destination_id) : '',
    region_id: trip.region_id ? String(trip.region_id) : '',
    summary: trip.summary ?? '',
    description: trip.description ?? '',
    departure_city: trip.departure_city ?? 'Tunis',
    duration_nights: String(trip.duration_nights),
    price_from: millimesToTnd(trip.price_from_millimes),
    old_price: millimesToTnd(trip.old_price_millimes),
    currency: trip.currency,
    includes: trip.includes ?? '',
    excludes: trip.excludes ?? '',
    image_url: trip.image_url ?? '',
    is_featured: !!trip.is_featured,
    is_active: !!trip.is_active,
    sort_order: String(trip.sort_order ?? 0),
    en: {
      title: en.title ?? '', summary: en.summary ?? '', description: en.description ?? '',
      includes: en.includes ?? '', excludes: en.excludes ?? '',
    },
    days: days.map((d) => ({
      title: d.title, description: d.description ?? '',
      en_title: d.i18n?.en?.title ?? '', en_description: d.i18n?.en?.description ?? '',
    })),
    images: images.map((i) => ({ url: i.url, alt: i.alt ?? '' })),
    departures: departures.map((d) => ({
      dbId: d.id,
      departure_date: String(d.departure_date).slice(0, 10),
      return_date: d.return_date ? String(d.return_date).slice(0, 10) : '',
      price: millimesToTnd(d.price_per_person_millimes),
      single: millimesToTnd(d.single_supplement_millimes),
      child: millimesToTnd(d.child_price_millimes),
      seats_total: d.seats_total == null ? '' : String(d.seats_total),
      seats_left: d.seats_left == null ? '' : String(d.seats_left),
      is_active: !!d.is_active,
    })),
  };
}

const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => String(v).trim() !== ''));
const intOrNull = (s) => (s === '' ? null : Number(s));

/** Valeurs du formulaire  ->  corps de la requête API */
export function toPayload(v) {
  const en = compact(v.en);
  return {
    type: v.type,
    slug: v.slug,
    title: v.title,
    destination_id: v.type === 'circuit' ? null : Number(v.destination_id) || null,
    region_id: v.type === 'circuit' ? Number(v.region_id) || null : null,
    summary: v.summary,
    description: v.description,
    departure_city: v.departure_city,
    duration_nights: Number(v.duration_nights),
    price_from_millimes: tndToMillimes(v.price_from),
    old_price_millimes: tndToMillimes(v.old_price),
    currency: v.currency,
    includes: v.includes,
    excludes: v.excludes,
    image_url: v.image_url,
    is_featured: v.is_featured,
    is_active: v.is_active,
    sort_order: Number(v.sort_order || 0),
    i18n: Object.keys(en).length ? { en } : {},
    days: v.days.map((d, i) => {
      const dEn = compact({ title: d.en_title, description: d.en_description });
      return {
        day_number: i + 1, title: d.title, description: d.description,
        i18n: Object.keys(dEn).length ? { en: dEn } : {},
      };
    }),
    images: v.images.map((i) => ({ url: i.url, alt: i.alt })),
    departures: v.departures.map((d) => ({
      id: d.dbId ?? null,
      departure_date: d.departure_date,
      return_date: d.return_date || null,
      price_per_person_millimes: tndToMillimes(d.price),
      single_supplement_millimes: tndToMillimes(d.single),
      child_price_millimes: tndToMillimes(d.child),
      seats_total: intOrNull(d.seats_total),
      seats_left: intOrNull(d.seats_left),
      is_active: d.is_active,
    })),
  };
}

/** Chemins renvoyés par le serveur  ->  noms des champs du formulaire */
const PATH_MAP = {
  price_from_millimes: 'price_from',
  old_price_millimes: 'old_price',
  price_per_person_millimes: 'price',
  single_supplement_millimes: 'single',
  child_price_millimes: 'child',
};
export const toFormPath = (p) => p.split('.').map((s) => PATH_MAP[s] ?? s).join('.');