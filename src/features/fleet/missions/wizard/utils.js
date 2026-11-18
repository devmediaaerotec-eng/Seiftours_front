import { addDays, hmOf } from '@/lib/format';

export const LEG_LABEL = { aller: 'Aller', retour: 'Retour', other: 'Autre étape' };
export const MODES = [['aller', 'Aller'], ['retour', 'Retour'], ['both', 'Aller & retour']];
export const DAYS = [[1, 'Lun'], [2, 'Mar'], [3, 'Mer'], [4, 'Jeu'], [5, 'Ven'], [6, 'Sam'], [7, 'Dim']];
export const PRESETS = [
  ['Une seule fois', []],
  ['Tous les jours', [1, 2, 3, 4, 5, 6, 7]],
  ['Lun – Ven', [1, 2, 3, 4, 5]],
  ['Lun – Sam', [1, 2, 3, 4, 5, 6]],
];

export const blank = () => ({
  driver_id: '', alt_driver_id: '', note: '', bus_id: '', custom: false, starts_at: '', ends_at: '',
});
export const when = (i) => `${i.reference} ${hmOf(i.starts_at)}–${hmOf(i.ends_at)}`;
export const sameDays = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
export const dm = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
export const hm = (v) => (v ? v.slice(11, 16) : '');

export function occurrenceDates(first, until, days) {
  const out = [];
  for (let i = 0; i <= 92; i += 1) {
    const d = addDays(first, i);
    if (d > until) break;
    if (days.includes(new Date(`${d}T12:00:00`).getDay() || 7)) out.push(d);
  }
  return out;
}
export const mondayOf = (ymd) => addDays(ymd, -((new Date(`${ymd}T12:00:00`).getDay() + 6) % 7));
export const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000);
export const shiftDt = (v, n) => (v ? `${addDays(v.slice(0, 10), n)}${v.slice(10)}` : v);

export const initial = (d = {}) => ({
  mission_type: 'transfer', title: '', client_id: '', notes: '',
  repeat_days: [], repeat_until: '',
  legs: [{
    leg: 'aller',
    starts_at: d.date ? `${d.date}T08:00` : '', ends_at: d.date ? `${d.date}T10:00` : '',
    pickup_place: '', destination: '',
    assignments: [{ ...blank(), driver_id: d.driver_id ? String(d.driver_id) : '', bus_id: d.bus_id ? String(d.bus_id) : '' }],
  }],
});

export function modeOf(legs = []) {
  if (legs.length === 1 && legs[0].leg === 'aller') return 'aller';
  if (legs.length === 1 && legs[0].leg === 'retour') return 'retour';
  if (legs.length === 2 && legs[0].leg === 'aller' && legs[1].leg === 'retour') return 'both';
  return 'custom';
}

/** Retour pré-rempli : même jour 16:00–18:00, trajet inversé, mêmes chauffeurs et bus. */
export function makeReturn(first) {
  const day = (first.starts_at || '').slice(0, 10);
  return {
    leg: 'retour',
    starts_at: day ? `${day}T16:00` : '', ends_at: day ? `${day}T18:00` : '',
    pickup_place: first.destination || '', destination: first.pickup_place || '',
    assignments: (first.assignments ?? []).map((a) => ({
      ...blank(), driver_id: a.driver_id, alt_driver_id: a.alt_driver_id, bus_id: a.bus_id, note: a.note,
    })),
  };
}