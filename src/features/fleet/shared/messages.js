import { fmtDayLong, hmOf, minutesBetween, nowLocal } from '@/lib/format';

const SEP = '\u2501'.repeat(16);
const ARROW = '\u2192';
const CROSS = '\u274C';
const WARN = '\u26A0\uFE0F';
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
const isCancelled = (m) => m.status === 'cancelled';
/** Déjà envoyée au chauffeur puis modifiée (needs_resend seul est aussi vrai pour un premier envoi). */
const isUpdate = (m) => !!m.notified_at && !!m.needs_resend;
/** Nom du chauffeur dans le groupe : « habib (Kalaa) ». */
const driverLabel = (m) => `${m.driver_first_name || m.driver_name}${m.driver_note ? ` (${m.driver_note})` : ''}`;

/** Retard en minutes : depuis le début (planifiée) ou la fin (en cours). */
export const minsLate = (m, now = nowLocal()) =>
  minutesBetween(iso(m.status === 'in_progress' ? m.ends_at : m.starts_at), now);

/** Ajoute à chaque mission son équipe (même horaire) et ses relais (autres horaires). */
export function withCrew(items) {
  const by = new Map();
  items.forEach((m) => {
    if (!m.group_ref || m.status === 'cancelled') return;
    const k = `${m.group_ref}|${m.leg || ''}`;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(m);
  });
  return items.map((m) => {
    const others = (by.get(`${m.group_ref}|${m.leg || ''}`) ?? []).filter((o) => o.driver_id !== m.driver_id);
    const same = (o) => o.starts_at === m.starts_at && o.ends_at === m.ends_at;
    return {
      ...m,
      team: others.filter(same).map((o) => o.driver_first_name),
      relay: others.filter((o) => !same(o)).map((o) => `${o.driver_first_name} ${hmOf(o.starts_at)} ${ARROW} ${hmOf(o.ends_at)}`),
    };
  });
}

/** Fiche d'une mission, pour un chauffeur. */
export const lineOf = (m) => [
  `  *${hmOf(m.starts_at)} ${ARROW} ${hmOf(m.ends_at)}*${LEG[m.leg] ? `  ${LEG[m.leg].toUpperCase()}` : ''}`,
  `  Mission : ${m.title}`,
  m.client_name && `  Client : ${m.client_name}`,
  routeOf(m) && `  Trajet : ${routeOf(m)}`,
  `  Bus : ${plate(m)}${m.pax ? ` (${m.pax} pers.)` : ''}`,
  m.driver_note && `  Zone : ${m.driver_note}`,
  m.team?.length > 0 && `  \u00c9quipe : ${m.team.join(', ')}`,
  m.relay?.length > 0 && `  Relais : ${m.relay.join(' ; ')}`,
  m.client_phone && `  Contact client : ${m.client_phone}`,
  m.notes && `  Consignes : ${m.notes.replace(/\s+/g, ' ')}`,
].filter(Boolean).join('\n');

/** Fiche d'une mission annulée : sans bus ni trajet, avec le motif. */
export const cancelledLineOf = (m) => [
  `  ${CROSS} *ANNUL\u00c9E* : ${hmOf(m.starts_at)} ${ARROW} ${hmOf(m.ends_at)}${LEG[m.leg] ? `  ${LEG[m.leg].toUpperCase()}` : ''}`,
  `  Mission : ${m.title}`,
  m.client_name && `  Client : ${m.client_name}`,
  m.control_note && `  Motif : ${m.control_note.replace(/\s+/g, ' ')}`,
].filter(Boolean).join('\n');

/** Programme d'un chauffeur pour une journée (les annulées sont signalées). */
export const dayMessage = (name, date, items) =>
  `${head('PROGRAMME DU JOUR', fmtDayLong(date))}\n\nBonjour ${name},\nVoici votre programme :\n\n`
  + (items.some(isCancelled) ? `${WARN} *Mise \u00e0 jour : certaines missions sont annul\u00e9es.*\n\n` : '')
  + `${items.map((m) => (isCancelled(m) ? cancelledLineOf(m) : lineOf(m))).join('\n\n')}\n\n${CONFIRM}\n\n${FOOT}`;

/** Une seule mission, pour son chauffeur : nouvelle, mise à jour ou annulation. */
export const missionMessage = (m) => {
  const day = fmtDayLong(m.starts_at.slice(0, 10));
  const hello = `Bonjour ${m.driver_first_name || m.driver_name},`;

  if (isCancelled(m)) {
    return `${head('MISSION ANNUL\u00c9E', day)}\n\n${hello}\nNous vous informons que la mission suivante est annul\u00e9e :\n\n`
      + `${cancelledLineOf(m)}\n\nVous n'avez plus \u00e0 l'assurer. Veuillez nous excuser pour ce changement.\n\n${FOOT}`;
  }
  return `${head(isUpdate(m) ? 'MISE \u00c0 JOUR DE MISSION' : 'MISSION', day)}\n\n`
    + `${hello}\n${isUpdate(m) ? 'Votre mission a \u00e9t\u00e9 modifi\u00e9e. Informations \u00e0 jour :\n' : ''}\n${lineOf(m)}\n\n${CONFIRM}\n\n${FOOT}`;
};

const LEG_TITLE = { aller: 'Aller', retour: 'Retour', other: 'Programme' };

/** Message du groupe pour une journée : client > sens > créneau (chauffeurs), relais signalés. */
export const groupDayMessage = (date, items) => {
  const tree = new Map();
  const slotsOf = new Map();
  items.filter((m) => m.status !== 'cancelled').forEach((m) => {
    const client = m.client_name || 'Sans client';
    const leg = m.leg || 'other';
    const slot = `${hmOf(m.starts_at)}|${hmOf(m.ends_at)}`;
    if (!tree.has(client)) tree.set(client, new Map());
    const legs = tree.get(client);
    if (!legs.has(leg)) legs.set(leg, new Map());
    const slots = legs.get(leg);
    if (!slots.has(slot)) slots.set(slot, []);
    slots.get(slot).push(m);
    if (m.group_ref) {
      const k = `${m.group_ref}|${leg}`;
      if (!slotsOf.has(k)) slotsOf.set(k, new Set());
      slotsOf.get(k).add(slot);
    }
  });

  const blocks = [...tree.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([client, legs]) => {
    const rows = ['aller', 'retour', 'other'].filter((l) => legs.has(l)).flatMap((leg) => {
      const slots = [...legs.get(leg).entries()].sort(([a], [b]) => a.localeCompare(b));
      const lines = slots.map(([slot, list]) => {
        const [s, e] = slot.split('|');
        const relay = list.some((m) => m.group_ref && slotsOf.get(`${m.group_ref}|${leg}`)?.size > 1);
        const names = list.map(driverLabel).sort().join(', ');
        return `  ${s} ${ARROW} ${e} : ${names}${relay ? ' (relais)' : ''}`;
      });
      const route = routeOf(slots[0][1][0]);
      return [`  *${LEG_TITLE[leg]}*`, ...lines, route && `  ${route}`].filter(Boolean);
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
  const leg = LEG[m.leg] ? ` (${LEG[m.leg]})` : '';
  const off = kind === 'cancelled';
  const detail = [
    `  Mission : ${m.title} (${m.reference})${leg}`,
    `  Date : ${fmtDayLong(m.starts_at.slice(0, 10))}, ${hmOf(m.starts_at)} ${ARROW} ${hmOf(m.ends_at)}`,
    m.client_name && `  Client : ${m.client_name}`,
    !off && `  Bus : ${plate(m)}`,
    !off && routeOf(m) && `  Trajet : ${routeOf(m)}`,
    !off && m.driver_note && `  Zone : ${m.driver_note}`,
    !off && m.pax && `  Passagers : ${m.pax}`,
    !off && m.notes && `  Consignes : ${m.notes.replace(/\s+/g, ' ')}`,
    off && m.control_note && `  Motif : ${m.control_note.replace(/\s+/g, ' ')}`,
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
      return `${send('MISSION ANNUL\u00c9E', `${CROSS} La mission suivante est annul\u00e9e.`)}`
        + `\n\n${to === 'group' ? 'Merci de votre compr\u00e9hension.' : "Vous n'avez plus \u00e0 l'assurer. Veuillez nous excuser pour ce changement."}\n\n${FOOT}`;
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