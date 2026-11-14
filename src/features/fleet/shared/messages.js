import { fmtDayLong, hmOf, minutesBetween, nowLocal } from '@/lib/format';

const SEP = '\u2501'.repeat(16);
const ARROW = '\u2192';
const LEG = { aller: 'Aller', retour: 'Retour' };

const iso = (s) => s.replace(' ', 'T').slice(0, 16);
const plate = (m) => m.bus_plate || m.bus_code;
const routeOf = (m) => [m.pickup_place, m.destination].filter(Boolean).join(` ${ARROW} `);
const dur = (min) => {
  const v = Math.max(0, min);
  return v < 60 ? `${v} min` : `${Math.floor(v / 60)} h ${String(v % 60).padStart(2, '0')}`;
};
const head = (title, sub) => [`*SEIF TOURS | ${title}*`, sub, SEP].filter(Boolean).join('\n');
const FOOT = '_Seif Tours_';
const CONFIRM = 'Merci de confirmer la bonne r\u00e9ception.';

/** Retard en minutes : depuis le début (planifiée) ou la fin (en cours). */
export const minsLate = (m, now = nowLocal()) =>
  minutesBetween(iso(m.status === 'in_progress' ? m.ends_at : m.starts_at), now);

/** Fiche d'une mission, pour un chauffeur. */
export const lineOf = (m) => [
  `  *${hmOf(m.starts_at)} ${ARROW} ${hmOf(m.ends_at)}*${LEG[m.leg] ? `  ${LEG[m.leg].toUpperCase()}` : ''}`,
  `  Mission : ${m.title}`,
  m.client_name && `  Client : ${m.client_name}`,
  routeOf(m) && `  Trajet : ${routeOf(m)}`,
  `  Bus : ${plate(m)}${m.pax ? ` (${m.pax} pers.)` : ''}`,
  m.notes && `  Consignes : ${m.notes.replace(/\s+/g, ' ')}`,
].filter(Boolean).join('\n');

/** Programme d'un chauffeur pour une journée. */
export const dayMessage = (name, date, items) =>
  `${head('PROGRAMME DU JOUR', fmtDayLong(date))}\n\nBonjour ${name},\nVoici votre programme :\n\n`
  + `${items.map(lineOf).join('\n\n')}\n\n${CONFIRM}\n\n${FOOT}`;

/** Une seule mission, pour son chauffeur. */
export const missionMessage = (m) =>
  `${head(m.needs_resend ? 'MISE \u00c0 JOUR DE MISSION' : 'MISSION', fmtDayLong(m.starts_at.slice(0, 10)))}\n\n`
  + `Bonjour ${m.driver_first_name || m.driver_name},\n\n${lineOf(m)}\n\n${CONFIRM}\n\n${FOOT}`;

/** Message du boss pour une journée : client > heure > chauffeurs. */
export const groupDayMessage = (date, items) => {
  const byClient = new Map();
  items.filter((m) => m.status !== 'cancelled').forEach((m) => {
    const c = m.client_name || 'Sans client';
    const slot = `${hmOf(m.starts_at)}|${m.leg || 'other'}`;
    if (!byClient.has(c)) byClient.set(c, new Map());
    const slots = byClient.get(c);
    if (!slots.has(slot)) slots.set(slot, []);
    slots.get(slot).push(m);
  });
  const blocks = [...byClient.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([client, slots]) => {
    const rows = [...slots.entries()].sort(([a], [b]) => a.localeCompare(b)).flatMap(([slot, list]) => {
      const [time, leg] = slot.split('|');
      return [
        `  ${[LEG[leg], time].filter(Boolean).join(' ')} : ${list.map((m) => m.driver_first_name || m.driver_name).join(', ')}`,
        routeOf(list[0]) && `  ${routeOf(list[0])}`,
      ].filter(Boolean);
    });
    return `*${client.toUpperCase()}*\n${rows.join('\n')}`;
  });
  return `${head('PROGRAMME DU JOUR', fmtDayLong(date))}\n\n${blocks.join('\n\n')}\n\n${FOOT}`;
};

/** Groupe : toutes les missions en retard. */
export const lateGroupMessage = (items, now = nowLocal()) =>
  `${head(`MISSIONS EN RETARD (${items.length})`)}\n\n${items.map((m) =>
    `*${hmOf(m.starts_at)}*  ${m.title}\n  ${m.driver_name} | Bus ${plate(m)}\n  Retard : ${dur(minsLate(m, now))}`).join('\n\n')}`
  + `\n\nMerci de confirmer votre position.\n\n${FOOT}`;

export const NOTICE_KINDS = [
  { key: 'late',      label: 'Retard',        groupOk: true },
  { key: 'reminder',  label: 'Rappel',        groupOk: true },
  { key: 'changed',   label: 'Modification',  groupOk: true },
  { key: 'cancelled', label: 'Annulation',    groupOk: true },
  { key: 'warning',   label: 'Avertissement', groupOk: false }, // jamais dans le groupe
];

/** Message pour une mission. to = 'driver' | 'group'. */
export function buildNotice(kind, m, { to = 'driver', now = nowLocal() } = {}) {
  const first = m.driver_first_name || m.driver_name;
  const who = to === 'group' ? `Chauffeur : ${m.driver_name}\n\n` : `Bonjour ${first},\n\n`;
  const detail = [
    `  Mission : ${m.title} (${m.reference})`,
    `  Date : ${fmtDayLong(m.starts_at.slice(0, 10))}, ${hmOf(m.starts_at)} ${ARROW} ${hmOf(m.ends_at)}`,
    m.client_name && `  Client : ${m.client_name}`,
    `  Bus : ${plate(m)}`,
    routeOf(m) && `  Trajet : ${routeOf(m)}`,
    m.pax && `  Passagers : ${m.pax}`,
    m.notes && `  Consignes : ${m.notes.replace(/\s+/g, ' ')}`,
  ].filter(Boolean).join('\n');
  const send = (title, body) => `${head(title)}\n\n${who}${body}\n\n${detail}`;

  switch (kind) {
    case 'late': {
      const d = dur(minsLate(m, now));
      const why = m.status === 'in_progress' ? `d\u00e9passe son heure de fin de ${d}` : `a ${d} de retard au d\u00e9part`;
      return `${send('RETARD DE MISSION', to === 'group' ? `La mission ${why}. En attente de confirmation du chauffeur.` : `Votre mission ${why}.`)}`
        + `${to === 'group' ? '' : "\n\nMerci de nous confirmer votre position et l'heure d'arriv\u00e9e estim\u00e9e."}\n\n${FOOT}`;
    }
    case 'reminder':
      return `${send('RAPPEL DE MISSION', `D\u00e9part pr\u00e9vu \u00e0 ${hmOf(m.starts_at)}.`)}\n\n${CONFIRM}\n\n${FOOT}`;
    case 'changed':
      return `${send('MISSION MODIFI\u00c9E', 'Le programme a chang\u00e9. Merci de tenir compte des informations ci-dessous.')}\n\n${CONFIRM}\n\n${FOOT}`;
    case 'cancelled':
      return `${send('MISSION ANNUL\u00c9E', 'La mission suivante est annul\u00e9e.')}\n\nAucune action n'est n\u00e9cessaire de votre part.\n\n${FOOT}`;
    case 'warning':
      return `${send('AVERTISSEMENT', 'Nous avons constat\u00e9 un manquement concernant la mission suivante.')}\n\nMotif : [\u00e0 compl\u00e9ter]\n\n`
        + `Nous vous demandons de respecter le programme et les horaires. Merci de r\u00e9pondre pour confirmer la prise de connaissance.\n\n${FOOT}`;
    default:
      return '';
  }
}

/* ------------------------------------------------------------- clients */

/** Une étape = même horaire et même sens, avec le nombre de bus. Pas de chauffeur ni de plaque. */
export const clientProgramMessage = (client, items) => {
  const steps = new Map();
  items.filter((m) => m.status !== 'cancelled').forEach((m) => {
    const k = `${m.starts_at}|${m.ends_at}|${m.leg || ''}`;
    if (!steps.has(k)) steps.set(k, { ...m, buses: 0 });
    steps.get(k).buses += 1;
  });
  const byDay = new Map();
  [...steps.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).forEach((s) => {
    const d = s.starts_at.slice(0, 10);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(s);
  });
  const blocks = [...byDay.entries()].map(([day, list]) =>
    `*${fmtDayLong(day).toUpperCase()}*\n${list.map((s) => [
      `  *${hmOf(s.starts_at)} ${ARROW} ${hmOf(s.ends_at)}*${LEG[s.leg] ? `  ${LEG[s.leg].toUpperCase()}` : ''}`,
      `  ${s.title}`,
      routeOf(s) && `  Trajet : ${routeOf(s)}`,
      `  Bus : ${s.buses}`,
    ].filter(Boolean).join('\n')).join('\n\n')}`);
  return `${head('VOTRE PROGRAMME')}\n\nBonjour ${client.contact_name || client.name},\n\n`
    + `Voici le programme de vos transports :\n\n${blocks.join('\n\n')}\n\n`
    + `Pour toute modification, merci de nous contacter.\n\n${FOOT}`;
};


export const inviteMessage = (client, link) =>
  `${head('VOTRE ESPACE CLIENT')}\n\nBonjour ${client.contact_name || client.name},\n\n`
  + `Seif Tours vous invite \u00e0 cr\u00e9er votre espace client pour suivre vos missions :\n${link}\n\n`
  + `Ce lien est personnel et valable 7 jours.\n\n${FOOT}`;