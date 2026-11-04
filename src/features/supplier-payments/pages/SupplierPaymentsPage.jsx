import PageHeader from '@/components/ui/PageHeader';
import PaymentForm from '../components/PaymentForm';
import Overview, { METHOD_COLORS } from '../components/Overview';
import { METHODS, MONTHS_SHORT, fmtAmount, monthLabel } from '../model';
import { deletePayment, savePayment, useMeta, usePayments } from '../paymentsApi';
import '../payments.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote, Check, ChevronDown, Download, FileSpreadsheet, FileText,
  Landmark, Pencil, Plus, Search, Trash2, Wallet, X, Calendar, Filter,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../exportUtils';

const ICONS = { transfer: Landmark, cheque: FileText, cash: Banknote, other: Wallet };
const EMPTY = { count: 0, total: 0, by_method: {}, by_month: {} };

export default function SupplierPaymentsPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(0);
  const [supplier, setSupplier] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [form, setForm] = useState(null);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  // Export menu
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(t); }, [notice]);

  const params = { year, month: month || '', supplier, method, status, q: dq };
  const { data, loading, error, reload } = usePayments(params);
  const meta = useMeta(version);

  const years = useMemo(() => [...new Set([thisYear, ...meta.years])].sort((a, b) => b - a), [meta.years, thisYear]);
  const items = data?.items ?? [];
  const summary = data?.summary ?? EMPTY;

  const groups = useMemo(() => {
    const m = new Map();
    items.forEach((p) => { const k = p.paid_on.slice(0, 7); if (!m.has(k)) m.set(k, []); m.get(k).push(p); });
    return [...m.entries()];
  }, [items]);

  // ✅ FIX: utiliser `q` (brut) au lieu de `dq` (debounced) pour l'affichage
  const activeFilters = [supplier, method, status, q, month].filter(Boolean).length;
  const clearAll = () => { setSupplier(''); setMethod(''); setStatus(''); setQ(''); setMonth(0); };

  // ✅ FIX: fermer le menu sur `click` (au lieu de `mousedown`) pour éviter les race conditions
  useEffect(() => {
    if (!exportOpen) return;
    const onDocClick = (e) => {
      if (!exportRef.current?.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [exportOpen]);

  const refresh = () => { reload(); setVersion((v) => v + 1); };
  const onSaved = (saved, again) => {
    refresh();
    setNotice(`Règlement enregistré : ${saved.supplier_name}, ${fmtAmount(saved.amount_millimes)} TND`);
    if (!again) setForm(null);
  };
  const remove = async (p) => {
    if (!window.confirm(`Supprimer ce règlement ?\n${p.supplier_name}, ${fmtAmount(p.amount_millimes)} TND`)) return;
    setActionError('');
    try { await deletePayment(p.id); refresh(); setNotice('Règlement supprimé'); } catch (e) { setActionError(e.message); }
  };
  const markCleared = async (p) => {
    setActionError('');
    try {
      await savePayment(p.id, { method: p.method, paid_on: p.paid_on, supplier_name: p.supplier_name, reference: p.reference, bank: p.bank,
        amount_millimes: p.amount_millimes, label: p.label, sales_invoices: p.sales_invoices, status: 'cleared', notes: p.notes, confirm_duplicate: true });
      refresh(); setNotice('Chèque marqué comme encaissé');
    } catch (e) { setActionError(e.message); }
  };

  const handleExportExcel = async () => {
    setActionError('');
    setExportOpen(false);
    setExporting(true);
    try {
      exportToExcel(items, { year, month, supplier, status, q: dq });
      setNotice('Export Excel téléchargé');
    } catch (e) {
      setActionError(e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setActionError('');
    setExportOpen(false);
    setExporting(true);
    try {
      exportToPdf(items, { year, month, supplier, status, q: dq, summary });
      setNotice('Export PDF téléchargé');
    } catch (e) {
      setActionError(e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="sp">
      <PageHeader
        title="Règlements fournisseurs"
        action={<button className="btn" onClick={() => setForm({})}><Plus size={16} /> Nouveau règlement</button>}
      />

      <Overview year={year} month={month} onMonth={setMonth} method={method} onMethod={setMethod} summary={summary} loading={loading && !data} />

      {/* ========== BARRE DE FILTRES ========== */}
      <div className="sp-filters">
        <div className="sp-filters-main">
          <label className="sp-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Rechercher un fournisseur, libellé, n° de virement…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && <button type="button" onClick={() => setQ('')} aria-label="Effacer"><X size={14} /></button>}
          </label>

          <div className="sp-select-wrap">
            <Calendar size={15} className="sp-select-icon" />
            <select value={year} onChange={(e) => { setYear(Number(e.target.value)); setMonth(0); }} aria-label="Année">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="sp-select-wrap">
            <Wallet size={15} className="sp-select-icon" />
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)} aria-label="Fournisseur">
              <option value="">Tous les fournisseurs</option>
              {meta.suppliers.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <button
            className={`sp-chip-filter ${status === 'pending' ? 'on' : ''}`}
            onClick={() => setStatus(status === 'pending' ? '' : 'pending')}
            aria-pressed={status === 'pending'}
          >
            <Filter size={14} />
            Chèques en attente
          </button>

          {/* ✅ FIX: menu d'export isolé avec margin-left:auto via classe */}
          <div className="sp-export" ref={exportRef}>
            <button
              type="button"
              className={`sp-export-trigger ${exportOpen ? 'open' : ''}`}
              onClick={() => setExportOpen((o) => !o)}
              disabled={exporting || !items.length}
              title="Exporter la sélection"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
            >
              <Download size={16} />
              <ChevronDown size={12} className="sp-export-caret" />
            </button>

            {exportOpen && (
              <div className="sp-export-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportExcel}
                  disabled={exporting}
                >
                  <FileSpreadsheet size={16} className="sp-export-ico excel" />
                  <span>
                    <strong>Excel</strong>
                    <small>.xlsx · toutes les colonnes</small>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportPdf}
                  disabled={exporting}
                >
                  <FileText size={16} className="sp-export-ico pdf" />
                  <span>
                    <strong>PDF</strong>
                    <small>mise en page prête à imprimer</small>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {activeFilters > 0 && (
          <div className="sp-filters-active">
            <span className="sp-filters-count">{activeFilters} filtre{activeFilters > 1 ? 's' : ''} actif{activeFilters > 1 ? 's' : ''}</span>
            <button className="sp-link" onClick={clearAll}>Tout effacer</button>
          </div>
        )}
      </div>

      {(error || actionError) && <div className="alert bad">{actionError || error.message}</div>}
      {notice && <div className="alert ok" role="status">{notice}</div>}
      {data?.truncated && <div className="alert bad">Seuls les 2000 derniers règlements sont affichés. Affinez les filtres.</div>}

      {loading && !data ? <div className="sp-empty">Chargement…</div>
        : items.length === 0 ? (
          <div className="sp-empty">
            <Wallet size={36} />
            <h3>Aucun règlement ici</h3>
            <p>Enregistrez un virement ou un chèque, il apparaîtra dans le mois correspondant.</p>
            <button className="btn" onClick={() => setForm({})}>Nouveau règlement</button>
          </div>
        ) : groups.map(([ym, rows]) => {
          const mt = summary.by_month[ym];
          return (
            <section key={ym} className="sp-month">
              <div className="sp-month-head">
                <h3>{monthLabel(ym)}</h3>
                <p>{mt?.count ?? 0} règlement{(mt?.count ?? 0) > 1 ? 's' : ''}, <b className="num">{fmtAmount(mt?.total ?? 0)} TND</b></p>
              </div>
              <div className="sp-ledger">
                {rows.map((p) => {
                  const Icon = ICONS[p.method];
                  const pending = p.status === 'pending';
                  return (
                    <div key={p.id} className={`sp-row ${pending ? 'pending' : ''} ${p.status === 'cancelled' ? 'cancelled' : ''}`}>
                      <div className="sp-day"><b>{p.paid_on.slice(8, 10)}</b><small>{MONTHS_SHORT[Number(p.paid_on.slice(5, 7)) - 1].toLowerCase()}.</small></div>
                      <span className="sp-medal" style={{ '--c': METHOD_COLORS[p.method] }} title={METHODS[p.method].label}><Icon size={18} /></span>
                      <div className="sp-who">
                        <strong>{p.supplier_name}</strong>
                        {p.label && <small className="lab">{p.label}</small>}
                        <small>
                          {METHODS[p.method].label}{p.reference ? ` N°${p.reference}` : ''}{p.bank ? `, ${p.bank}` : ''}
                          {pending && <span className="sp-pill pending" style={{ marginLeft: '.5rem' }}>À encaisser</span>}
                          {p.status === 'cancelled' && <span className="sp-pill cancelled" style={{ marginLeft: '.5rem' }}>Annulé</span>}
                        </small>
                      </div>
                      <div className="sp-tags">{p.sales_invoices.map((v) => <span key={v} className="sp-tag">{v}</span>)}</div>
                      <div className="amt">{fmtAmount(p.amount_millimes)}<small>TND</small></div>
                      <div className="sp-acts">
                        {p.method === 'cheque' && pending && <button className="sp-icon-btn ok" title="Marquer comme encaissé" aria-label="Marquer comme encaissé" onClick={() => markCleared(p)}><Check size={18} /></button>}
                        <button className="sp-icon-btn" title="Modifier" aria-label="Modifier" onClick={() => setForm({ payment: p })}><Pencil size={17} /></button>
                        <button className="sp-icon-btn danger" title="Supprimer" aria-label="Supprimer" onClick={() => remove(p)}><Trash2 size={17} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

      {form && <PaymentForm payment={form.payment} meta={meta} defaults={form.defaults} onClose={() => setForm(null)} onSaved={onSaved} />}
    </div>
  );
}