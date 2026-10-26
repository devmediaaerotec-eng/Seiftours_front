// Modèle du formulaire <-> API. Argent : dinars à l'écran, millimes en base (1 TND = 1000).
export const TYPES = {  organized: 'Voyage organisé' };

export const toMillimes = (tnd) => (tnd === '' || tnd == null || isNaN(Number(tnd)) ? null : Math.round(Number(tnd) * 1000));
export const toTnd = (m) => (m == null ? '' : String(m / 1000));

export const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const emptyTrip = () => ({
  type: 'organized', title: '', slug: '', slugTouched: false, destination_id: '',
  summary: '', description: '', departure_city: 'Tunis', duration_nights: '',
  price_from: '', old_price: '', includes: '', excludes: '', image_url: '',
  is_featured: false, is_active: false, sort_order: 0,
  days: [], images: [], departures: [],
});

export const fromApi = (t) => ({
  ...emptyTrip(), ...t,
  slugTouched: true,
  destination_id: t.destination_id ?? '',
  summary: t.summary ?? '', description: t.description ?? '', includes: t.includes ?? '', excludes: t.excludes ?? '',
  image_url: t.image_url ?? '', duration_nights: t.duration_nights ?? '',
  price_from: toTnd(t.price_from_millimes), old_price: toTnd(t.old_price_millimes),
  days: (t.days ?? []).map((d) => ({ id: d.id, title: d.title, description: d.description ?? '' })),   // numéro = position
  images: (t.images ?? []).map((i) => ({ id: i.id, url: i.url, alt: i.alt ?? '' })),                    // ordre = position
  departures: (t.departures ?? []).map((d) => ({
    id: d.id, departure_date: d.departure_date, return_date: d.return_date ?? '',
    price: toTnd(d.price_per_person_millimes), single: toTnd(d.single_supplement_millimes), child: toTnd(d.child_price_millimes),
    seats_total: d.seats_total ?? '', seats_left: d.seats_left ?? '', is_active: !!d.is_active,
  })),
});

const num = (v) => (v === '' || v == null ? null : Number(v));

export const toApi = (f) => ({
  type: f.type, title: f.title.trim(), slug: f.slug.trim(), destination_id: Number(f.destination_id),
  summary: f.summary.trim() || null, description: f.description.trim() || null,
  departure_city: f.departure_city.trim() || 'Tunis', duration_nights: Number(f.duration_nights),
  price_from_millimes: toMillimes(f.price_from), old_price_millimes: toMillimes(f.old_price),
  includes: f.includes.trim() || null, excludes: f.excludes.trim() || null,
  image_url: f.image_url.trim() || null, is_featured: f.is_featured, is_active: f.is_active, sort_order: Number(f.sort_order) || 0,
  days: f.days.map((d, i) => ({ id: d.id ?? null, day_number: i + 1, title: d.title.trim(), description: d.description.trim() || null })),
  images: f.images.map((im, i) => ({ id: im.id ?? null, url: im.url.trim(), alt: im.alt.trim() || null, sort_order: i })),
  departures: f.departures.map((d) => ({
    id: d.id ?? null, departure_date: d.departure_date, return_date: d.return_date || null,
    price_per_person_millimes: toMillimes(d.price), single_supplement_millimes: toMillimes(d.single), child_price_millimes: toMillimes(d.child),
    seats_total: num(d.seats_total), seats_left: num(d.seats_left), is_active: d.is_active,
  })),
});

// Mêmes règles que les contraintes SQL : on prévient l'utilisateur avant l'aller-retour serveur.
export function validate(f) {
  const e = {};
  if (!f.title.trim()) e.title = 'Le titre est obligatoire.';
  if (!/^[a-z0-9-]+$/.test(f.slug)) e.slug = 'Minuscules, chiffres et tirets uniquement.';
  if (!f.destination_id) e.destination_id = 'Choisissez une destination.';
  if (!(Number(f.duration_nights) > 0)) e.duration_nights = 'Durée > 0.';
  const p = toMillimes(f.price_from), o = toMillimes(f.old_price);
  if (f.price_from !== '' && p < 0) e.price_from = 'Prix invalide.';
  if (o != null && p != null && o <= p) e.old_price = "L'ancien prix doit être supérieur au prix actuel.";
  if (f.is_active && f.departures.filter((d) => d.is_active).length === 0 && p == null)
    e.price_from = 'Un voyage publié doit avoir un prix « à partir de » ou un départ actif.';
  e.days = f.days.map((d) => (d.title.trim() ? null : 'Titre requis'));
  e.images = f.images.map((i) => (/^https?:\/\//.test(i.url.trim()) || i.url.startsWith('/') ? null : 'URL invalide'));
  const seen = new Set();
  e.departures = f.departures.map((d) => {
    if (!d.departure_date) return 'Date de départ requise';
    if (seen.has(d.departure_date)) return 'Date déjà utilisée';
    seen.add(d.departure_date);
    if (d.return_date && d.return_date < d.departure_date) return 'Retour avant le départ';
    if (!(toMillimes(d.price) >= 0) || d.price === '') return 'Prix par personne requis';
    if (d.seats_total !== '' && d.seats_left !== '' && Number(d.seats_left) > Number(d.seats_total)) return 'Places restantes > places totales';
    return null;
  });
  const bad = (k) => Array.isArray(e[k]) && e[k].some(Boolean);
  const hasErr = Object.keys(e).some((k) => (Array.isArray(e[k]) ? bad(k) : !!e[k]));
  return { errors: e, ok: !hasErr };
}
