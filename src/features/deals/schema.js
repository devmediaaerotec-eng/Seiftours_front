import { z } from 'zod';
import { millimesToTnd, tndToMillimes } from '@/lib/format';

const moneyRe = /^\d+([.,]\d{1,3})?$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const moneyOpt = z.string().trim().refine((v) => v === '' || moneyRe.test(v), 'Montant invalide (ex. 189 ou 189.500)');
const dateOpt = z.string().refine((v) => v === '' || dateRe.test(v), 'Date invalide');

export const dealSchema = z.object({
  category_id: z.string().min(1, 'Choisissez une catégorie'),
  title: z.string().trim().min(1, 'Titre requis').max(190),
  description: z.string().max(500, '500 caractères maximum'),
  target: z.enum(['trip', 'hotel']),
  trip_id: z.string(),
  hotel_id: z.string(),
  hotel_label: z.string(),
  discount_text: z.string().max(40, '40 caractères maximum'),
  old_price: moneyOpt,
  price: moneyOpt,
  currency: z.enum(['TND', 'EUR', 'USD']),
  image_url: z.string().max(500),
  valid_from: dateOpt,
  valid_until: dateOpt,
  is_featured: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.string().refine((v) => v === '' || /^-?\d+$/.test(v), 'Nombre entier requis'),
  en: z.object({ title: z.string(), description: z.string(), discount_text: z.string() }),
}).superRefine((v, ctx) => {
  const issue = (path, message) => ctx.addIssue({ code: 'custom', path, message });
  if (v.target === 'trip' && !v.trip_id) issue(['trip_id'], 'Choisissez un voyage');
  if (v.target === 'hotel' && !v.hotel_id) issue(['hotel_id'], 'Choisissez un hôtel');
  const p = tndToMillimes(v.price);
  const o = tndToMillimes(v.old_price);
  if (p != null && o != null && o <= p) issue(['old_price'], "L'ancien prix doit être supérieur au prix actuel");
  if (v.valid_from && v.valid_until && v.valid_until < v.valid_from) issue(['valid_until'], 'La fin doit être après le début');
});

export const emptyDeal = () => ({
  category_id: '', title: '', description: '', target: 'trip', trip_id: '', hotel_id: '', hotel_label: '',
  discount_text: '', old_price: '', price: '', currency: 'TND', image_url: '',
  valid_from: '', valid_until: '', is_featured: false, is_active: true, sort_order: '0',
  en: { title: '', description: '', discount_text: '' },
});

/** Réponse API -> valeurs du formulaire */
export function toForm(d) {
  const en = d.i18n?.en ?? {};
  return {
    category_id: String(d.category_id),
    title: d.title,
    description: d.description ?? '',
    target: d.hotel_id ? 'hotel' : 'trip',
    trip_id: d.trip_id ? String(d.trip_id) : '',
    hotel_id: d.hotel_id ? String(d.hotel_id) : '',
    hotel_label: d.hotel_name ? `${d.hotel_name}${d.hotel_city ? ` · ${d.hotel_city}` : ''}` : '',
    discount_text: d.discount_text ?? '',
    old_price: millimesToTnd(d.old_price_millimes),
    price: millimesToTnd(d.price_millimes),
    currency: d.currency,
    image_url: d.image_url ?? '',
    valid_from: d.valid_from ? String(d.valid_from).slice(0, 10) : '',
    valid_until: d.valid_until ? String(d.valid_until).slice(0, 10) : '',
    is_featured: !!d.is_featured,
    is_active: !!d.is_active,
    sort_order: String(d.sort_order ?? 0),
    en: { title: en.title ?? '', description: en.description ?? '', discount_text: en.discount_text ?? '' },
  };
}

const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => String(v ?? '').trim() !== ''));

/** Valeurs du formulaire -> corps de la requête */
export function toPayload(v) {
  const en = compact(v.en);
  return {
    category_id: Number(v.category_id),
    title: v.title,
    description: v.description,
    trip_id: v.target === 'trip' ? Number(v.trip_id) || null : null,
    hotel_id: v.target === 'hotel' ? Number(v.hotel_id) || null : null,
    discount_text: v.discount_text,
    old_price_millimes: tndToMillimes(v.old_price),
    price_millimes: tndToMillimes(v.price),
    currency: v.currency,
    image_url: v.image_url,
    valid_from: v.valid_from,
    valid_until: v.valid_until,
    is_featured: v.is_featured,
    is_active: v.is_active,
    sort_order: Number(v.sort_order || 0),
    i18n: Object.keys(en).length ? { en } : {},
  };
}

const PATH_MAP = { price_millimes: 'price', old_price_millimes: 'old_price' };
export const toFormPath = (p) => PATH_MAP[p] ?? p;