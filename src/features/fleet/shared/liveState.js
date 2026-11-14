import { useEffect, useState } from 'react';
import { addMinutes, fmtDayLong, hmOf, nowLocal } from '@/lib/format';
 const GRACE = 10; // minutes de tolérance avant « en retard »

export const LIVE = {
  late:        { label: 'En retard',     cls: 'bad',   order: 0 },
  in_progress: { label: 'En cours',      cls: 'info',  order: 1 },
  upcoming:    { label: 'À venir',       cls: 'muted', order: 2 },
  completed:   { label: 'Effectuée',     cls: 'ok',    order: 3 },
  not_done:    { label: 'Non effectuée', cls: 'warn',  order: 4 },
  cancelled:   { label: 'Annulée',       cls: 'muted', order: 5 },
};

 export function liveState(m, now = nowLocal()) {
  if (m.is_late !== undefined) {
    if (m.is_late) return 'late';
    if (m.status === 'planned') return 'upcoming';
    return LIVE[m.status] ? m.status : 'upcoming';
  }
  // repli si le serveur ne fournit pas is_late
  const s = m.starts_at.slice(0, 16);
  const e = m.ends_at.slice(0, 16);
  if (m.status === 'planned') return addMinutes(s, GRACE) <= now && e >= now ? 'late' : 'upcoming';
  if (m.status === 'in_progress') return e < now ? 'late' : 'in_progress';
  return LIVE[m.status] ? m.status : 'upcoming';
}
export function useNow(ms = 60_000) {
  const [now, setNow] = useState(nowLocal);
  useEffect(() => {
    const t = setInterval(() => setNow(nowLocal()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/* ---------- WhatsApp ---------- */

/** Numéro tunisien : 8 chiffres → préfixe 216 */
export const waNumber = (phone = '') => {
  const d = phone.replace(/\D/g, '');
  return d.length === 8 ? `216${d}` : d.replace(/^00/, '');
};
export const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;

const lineOf = (m) => {
  const route = [m.pickup_place, m.destination].filter(Boolean).join(' → ');
  return `• ${hmOf(m.starts_at)}–${hmOf(m.ends_at)} · ${m.title}\n`
    + `  Bus ${m.bus_code}${route ? ` · ${route}` : ''}${m.pax ? ` · ${m.pax} pers.` : ''}`
    + `${m.notes ? `\n  ⚠ ${m.notes}` : ''}`;
};

export const dayMessage = (name, date, items) =>
  `Bonjour ${name},\nVotre programme du ${fmtDayLong(date)} :\n\n${items.map(lineOf).join('\n\n')}\n\nMerci de confirmer la bonne réception.`;

export const missionMessage = (m) =>
  `Bonjour ${m.driver_name},\n${m.needs_resend ? 'Mise à jour de votre mission' : 'Votre mission'} du ${fmtDayLong(m.starts_at.slice(0, 10))} :\n\n${lineOf(m)}\n\nMerci de confirmer la bonne réception.`;



/** Message groupé pour un groupe WhatsApp : tous les chauffeurs d'une journée. */
export const groupDayMessage = (date, items) => {
  const byDriver = new Map();
  items.filter((m) => m.status !== 'cancelled').forEach((m) => {
    if (!byDriver.has(m.driver_name)) byDriver.set(m.driver_name, []);
    byDriver.get(m.driver_name).push(m);
  });
  const blocks = [...byDriver.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, list]) => `👤 *${name}*\n${list
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map(lineOf).join('\n')}`);
  return `*Programme du ${fmtDayLong(date)}*\n\n${blocks.join('\n\n')}`;
};

/** WhatsApp ne permet pas d'écrire dans un groupe automatiquement :
 *  on copie le message, puis on ouvre WhatsApp pour que l'admin choisisse le groupe. */
export async function sendToGroup(text) {
  let copied = true;
  try { await navigator.clipboard.writeText(text); } catch { copied = false; }
  const url = text.length < 1800 ? `https://wa.me/?text=${encodeURIComponent(text)}` : 'https://wa.me/';
  window.open(url, '_blank', 'noopener,noreferrer');
  return copied; 
}


export const useLogNotice = () =>
  useMissionMutation(({ id, ...body }) => api(`${BASE}/${id}/notice`, { method: 'POST', body }));