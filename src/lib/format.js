export const money = (millimes) =>
  `${(Number(millimes || 0) / 1000).toLocaleString('fr-FR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} TND`;

export const fmtDate = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR') : '—';

// La base est en UTC : on convertit à l'affichage
export const fmtDateTime = (s) =>
  s ? new Date(`${String(s).replace(' ', 'T').slice(0, 19)}Z`).toLocaleString('fr-FR') : '—';
// 1450.5 TND  <->  1450500 millimes
export const millimesToTnd = (m) =>
  m == null ? '' : (m / 1000).toFixed(3).replace(/\.?0+$/, '');

export const tndToMillimes = (s) => {
  const t = String(s ?? '').trim().replace(',', '.');
  return t === '' ? null : Math.round(parseFloat(t) * 1000);
};

export const slugify = (s) =>
  String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 140);
// Les images locales sont relatives (/uploads/...). En production sur un autre domaine : VITE_ASSET_BASE=https://api.seiftours.tn

export const STATUS = {
  pending_agency:   { label: 'En attente agence', cls: 'warn' },
  awaiting_payment: { label: 'Attente paiement',  cls: 'warn' },
  paid:             { label: 'Payée',             cls: 'ok' },
  confirming:       { label: 'Confirmation',      cls: 'info' },
  confirmed:        { label: 'Confirmée',         cls: 'ok' },
  payment_failed:   { label: 'Paiement échoué',   cls: 'bad' },
  failed:           { label: 'Échec',             cls: 'bad' },
  cancelled:        { label: 'Annulée',           cls: 'bad' },
  expired:          { label: 'Expirée',           cls: 'muted' },
};

export const assetUrl = (u) =>
  !u ? '' : /^https?:\/\//.test(u) ? u : `${import.meta.env.VITE_ASSET_BASE ?? ''}${u}`;
export const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};


// ---- Missions : heures locales de Tunis, stockées sans fuseau ("2026-10-26 08:30:00")
export const ymdOf = (s) => String(s ?? '').slice(0, 10);
export const hmOf = (s) => String(s ?? '').slice(11, 16);
export const toInputDT = (s) => (s ? String(s).replace(' ', 'T').slice(0, 16) : '');

export const todayYmd = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date());

export const nowLocal = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Tunis', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;          // même format que starts_at
};

export const mondayOf = (ymd) => {
  const dow = (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(ymd, -dow);
};

export const addMinutes = (inputDT, mins) => {
  const d = new Date(`${inputDT}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + mins);
  return d.toISOString().slice(0, 16);
};

const dayFmt = (opts) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...opts });
const asDate = (ymd) => new Date(`${ymd}T00:00:00Z`);
export const fmtDayLong = (ymd) => dayFmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(asDate(ymd));
export const fmtDayShort = (ymd) => dayFmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(asDate(ymd));

export const fmtRange = (a, b) => {
  const da = ymdOf(a);
  const db = ymdOf(b);
  return da === db
    ? `${fmtDayShort(da)} · ${hmOf(a)} – ${hmOf(b)}`
    : `${fmtDayShort(da)} ${hmOf(a)} → ${fmtDayShort(db)} ${hmOf(b)}`;
};

/** Premier et dernier jour couverts par une mission (une fin à 00:00 appartient à la veille). */
export const missionDays = (m) => {
  const s = ymdOf(m.starts_at);
  let e = ymdOf(m.ends_at);
  if (hmOf(m.ends_at) === '00:00' && e > s) e = addDays(e, -1);
  return [s, e];
};


export const agoFromMs = (t) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
};

// Les dates de la base sont en UTC
export const timeAgo = (utc) =>
  (utc ? agoFromMs(new Date(`${String(utc).replace(' ', 'T').slice(0, 19)}Z`).getTime()) : '—');