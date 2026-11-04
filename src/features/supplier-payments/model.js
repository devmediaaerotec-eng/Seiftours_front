// Règlements fournisseurs. Argent : TND à l'écran (3 décimales), millimes dans l'API (1 TND = 1000).
export const METHODS = {
  transfer: { label: 'Virement', ref: 'N° de virement' },
  cheque: { label: 'Chèque', ref: 'N° de chèque' },
  cash: { label: 'Espèces', ref: 'Référence (facultatif)' },
  other: { label: 'Autre', ref: 'Référence (facultatif)' },
};
export const STATUS = { pending: 'En attente', cleared: 'Réglé', cancelled: 'Annulé' };
export const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export const MONTHS_SHORT = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

export const fmtAmount = (m) => (m / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
/** « 1 510,000 », « 1510.5 », « 1510,5 » → millimes ; null si invalide */
export const parseAmount = (s) => {
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : null;
};
export const fmtDate = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');
export const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const monthLabel = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

export const emptyForm = (keep = {}) => ({
  method: 'transfer', paid_on: todayISO(), supplier_name: '', reference: '', bank: '', amount: '', label: '',
  sales_invoices: [], status: 'cleared', notes: '', ...keep,
});
export const fromApi = (p) => ({
  method: p.method, paid_on: p.paid_on, supplier_name: p.supplier_name, reference: p.reference ?? '', bank: p.bank ?? '',
  amount: String(p.amount_millimes / 1000).replace('.', ','), label: p.label ?? '', sales_invoices: p.sales_invoices ?? [],
  status: p.status, notes: p.notes ?? '',
});
export const toApi = (f) => ({
  method: f.method, paid_on: f.paid_on, supplier_name: f.supplier_name.trim(), reference: f.reference.trim() || null,
  bank: f.bank.trim() || null, amount_millimes: parseAmount(f.amount), label: f.label.trim() || null,
  sales_invoices: f.sales_invoices, status: f.status, notes: f.notes.trim() || null,
});
export const validate = (f) => {
  const e = {};
  if (!f.paid_on) e.paid_on = 'Choisissez la date.';
  if (f.supplier_name.trim().length < 2) e.supplier_name = 'Indiquez le fournisseur.';
  if ((f.method === 'transfer' || f.method === 'cheque') && !f.reference.trim()) e.reference = f.method === 'cheque' ? 'Indiquez le numéro du chèque.' : 'Indiquez le numéro du virement.';
  if (parseAmount(f.amount) == null) e.amount_millimes = 'Montant invalide.';
  return e;
};
