import PageHeader from '@/components/ui/PageHeader';
import PaymentForm from '../components/PaymentForm';
import Overview, { METHOD_COLORS } from '../components/Overview';
import ElegantSelect from '../components/ElegantSelect';
import { METHODS, fmtAmount, monthLabel } from '../model';
import { deletePayment, savePayment, useMeta, usePayments } from '../paymentsApi';
import { exportToExcel, exportToPdf } from '../exportUtils';
import '../payments.css';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, ArrowUpDown, Calendar, Check, ChevronDown, Download, FileSpreadsheet, FileText,
  Pencil, Plus, Search, Trash2, Wallet, X,
} from 'lucide-react';

const EMPTY = { count: 0, total: 0, by_method: {}, by_month: {} };

const cmpText = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'fr', { sensitivity: 'base', numeric: true });
const methodText = (p) => (METHODS[p.method]?.label ?? p.method) + ' ' + (p.reference ?? '');

// Tri par colonne (le regroupement par mois est conservé)
const SORTERS = {
  date: (a, b) => cmpText(a.paid_on, b.paid_on) || cmpText(a.id, b.id),
  supplier: (a, b) => cmpText(a.supplier_name, b.supplier_name),
  method: (a, b) => cmpText(methodText(a), methodText(b)),
  amount: (a, b) => a.amount_millimes - b.amount_millimes,
  label: (a, b) => cmpText(a.label, b.label),
  invoices: (a, b) => cmpText((a.sales_invoices ?? []).join(' '), (b.sales_invoices ?? []).join(' ')),
};

const COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'supplier', label: 'Nom du fournisseur' },
  { key: 'method', label: 'Mode de règlement' },
  { key: 'amount', label: 'Montant (TND)', right: true },
  { key: 'label', label: 'Libellé' },
  { key: 'invoices', label: 'Facture(s) de vente' },
];

const METHOD_OPTIONS = [
  { value: '', label: 'Tous les modes' },
  { value: 'transfer', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'cash', label: 'Espèces' },
  { value: 'other', label: 'Autre' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'À encaisser' },
  { value: 'cleared', label: 'Encaissé' },
  { value: 'cancelled', label: 'Annulé' },
];

export default function SupplierPaymentsPage() {
  const thisYear = new Date().getFullYear();

  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(0);
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD
  const [supplier, setSupplier] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [form, setForm] = useState(null);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [sort, setSort] = useState({ key: 'date', dir: 'asc' });
  const [selected, setSelected] = useState(() => new Set());
  const exportRef = useRef(null);
  const tableRef = useRef(null);
  const anchorRef = useRef(null);

  // Recherche avec délai
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Disparition automatique du message de confirmation
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  // Fermeture du menu export au clic extérieur et sur Échap
  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setExportOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [exportOpen]);

  // Date précise : on charge le mois correspondant, puis on filtre sur le jour
  const handleDateChange = (val) => {
    setDateFilter(val);
    if (val) {
      const [y, m] = val.split('-');
      setYear(Number(y));
      setMonth(Number(m));
    }
  };
  // Un clic sur une barre mensuelle annule la date précise
  const pickMonth = (m) => { setMonth(m); setDateFilter(''); };
  const pickYear = (y) => { setYear(Number(y)); setMonth(0); setDateFilter(''); };

  const params = { year, month: month || '', supplier, method, status, q: dq };
  const { data, loading, error, reload } = usePayments(params);
  const meta = useMeta(version);

  const years = useMemo(
    () => [...new Set([thisYear, year, ...(meta.years ?? [])])].sort((a, b) => b - a),
    [meta.years, thisYear, year]
  );

  const items = useMemo(() => {
    const all = data?.items ?? [];
    return dateFilter ? all.filter((p) => p.paid_on === dateFilter) : all;
  }, [data, dateFilter]);

  const summary = data?.summary ?? EMPTY;

  // Regroupement par mois (chronologique), lignes triées selon la colonne choisie
  const groups = useMemo(() => {
    const m = new Map();
    items.forEach((p) => {
      const k = p.paid_on.slice(0, 7);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(p);
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    const monthDir = sort.key === 'date' ? dir : 1;
    const cmp = SORTERS[sort.key];
    let n = 0;
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]) * monthDir)
      .map(([ym, rows]) => {
        const sorted = [...rows].sort((a, b) => cmp(a, b) * dir || SORTERS.date(a, b));
        const g = {
          ym,
          rows: sorted,
          start: n,
          total: sorted.reduce((s, p) => (p.status === 'cancelled' ? s : s + p.amount_millimes), 0),
        };
        n += sorted.length;
        return g;
      });
  }, [items, sort]);

  const flatRows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'amount' ? 'desc' : 'asc' }));

  // Sélection façon tableur : clic, Ctrl/⌘ + clic, Maj + clic
  const selectRow = (p, e) => {
    if (e.shiftKey && anchorRef.current != null) {
      const a = flatRows.findIndex((r) => r.id === anchorRef.current);
      const b = flatRows.findIndex((r) => r.id === p.id);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        setSelected(new Set(flatRows.slice(lo, hi + 1).map((r) => r.id)));
        return;
      }
    }
    anchorRef.current = p.id;
    setSelected((prev) => {
      if (e.ctrlKey || e.metaKey) {
        const next = new Set(prev);
        next.has(p.id) ? next.delete(p.id) : next.add(p.id);
        return next;
      }
      return prev.size === 1 && prev.has(p.id) ? new Set() : new Set([p.id]);
    });
  };

  const onRowKey = (e, p) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const rows = [...tableRef.current.querySelectorAll('tr.sp-row-data')];
      const next = rows[rows.indexOf(e.currentTarget) + (e.key === 'ArrowDown' ? 1 : -1)];
      next?.focus();
    } else if (e.key === ' ') {
      e.preventDefault();
      selectRow(p, { ctrlKey: true });
    } else if (e.key === 'Enter') {
      setForm({ payment: p });
    } else if (e.key === 'Escape') {
      setSelected(new Set());
    }
  };

  const selectedRows = flatRows.filter((r) => selected.has(r.id));
  const sumOf = (rows) => rows.reduce((s, r) => (r.status === 'cancelled' ? s : s + r.amount_millimes), 0);

  // Date précise et mois = un seul filtre
  const activeFilters = [supplier, method, status, dq, dateFilter || month].filter(Boolean).length;

  const clearAll = () => {
    setSupplier(''); setMethod(''); setStatus(''); setQ(''); setMonth(0); setDateFilter('');
  };

  const refresh = () => { reload(); setVersion((v) => v + 1); };

  const onSaved = (saved, again) => {
    refresh();
    setNotice(`Règlement enregistré : ${saved.supplier_name}, ${fmtAmount(saved.amount_millimes)} TND`);
    if (!again) setForm(null);
  };

  const remove = async (p) => {
    if (!window.confirm(`Supprimer ce règlement ?\n${p.supplier_name}, ${fmtAmount(p.amount_millimes)} TND`)) return;
    setActionError('');
    try {
      await deletePayment(p.id);
      refresh();
      setNotice('Règlement supprimé');
    } catch (e) { setActionError(e.message); }
  };

  const markCleared = async (p) => {
    if (busyId) return;
    setBusyId(p.id);
    setActionError('');
    try {
      await savePayment(p.id, {
        method: p.method, paid_on: p.paid_on, supplier_name: p.supplier_name, reference: p.reference, bank: p.bank,
        amount_millimes: p.amount_millimes, label: p.label, sales_invoices: p.sales_invoices,
        status: 'cleared', notes: p.notes, confirm_duplicate: true,
      });
      refresh();
      setNotice('Chèque marqué comme encaissé');
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  // Export : on exporte exactement les lignes visibles
  const runExport = async (fn, doneMsg) => {
    setActionError('');
    setExportOpen(false);
    setExporting(true);
    try {
      await fn();
      setNotice(doneMsg);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setExporting(false);
    }
  };
  const exportParams = { year, month, supplier, method, status, q: dq, date: dateFilter };
  const handleExportExcel = () => runExport(() => exportToExcel(items, exportParams), 'Export Excel téléchargé');
  const handleExportPdf = () => runExport(() => exportToPdf(items, { ...exportParams, summary }), 'Export PDF téléchargé');

  return (
    <div className="sp">
      <PageHeader
        title="Règlements fournisseurs"
        action={<button className="btn" onClick={() => setForm({})}><Plus size={16} /> Nouveau règlement</button>}
      />

      <Overview
        year={year}
        month={month}
        onMonth={pickMonth}
        method={method}
        onMethod={setMethod}
        summary={summary}
        loading={loading && !data}
      />

      {/* ========== BARRE DE FILTRES ========== */}
      <div className="sp-filters">
        <div className="sp-filters-main">
          <label className="sp-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Fournisseur, libellé, n° de virement…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Rechercher un règlement"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="Effacer la recherche"><X size={14} /></button>
            )}
          </label>

          <div className="sp-fld" style={{ width: 110 }}>
            <ElegantSelect
              ariaLabel="Année"
              value={year}
              onChange={pickYear}
              options={years.map((y) => ({ value: y, label: String(y) }))}
            />
          </div>

          <label className="sp-date">
            <Calendar size={15} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => handleDateChange(e.target.value)}
              aria-label="Filtrer par jour"
            />
            {dateFilter && (
              <button type="button" onClick={() => setDateFilter('')} aria-label="Effacer la date"><X size={12} /></button>
            )}
          </label>

          <div className="sp-fld" style={{ width: 170 }}>
            <ElegantSelect ariaLabel="Mode de règlement" value={method} onChange={setMethod} options={METHOD_OPTIONS} />
          </div>

          <div className="sp-fld" style={{ width: 150 }}>
            <ElegantSelect ariaLabel="Statut" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </div>

          <div className="sp-fld" style={{ width: 220 }}>
            <ElegantSelect
              ariaLabel="Fournisseur"
              value={supplier}
              onChange={setSupplier}
              options={[
                { value: '', label: 'Tous les fournisseurs' },
                ...(meta.suppliers ?? []).map((s) => ({ value: s.name, label: s.name })),
              ]}
            />
          </div>

          <div className="sp-export" ref={exportRef}>
            <button
              type="button"
              className={`sp-export-trigger ${exportOpen ? 'open' : ''}`}
              onClick={() => setExportOpen((o) => !o)}
              disabled={exporting || !items.length}
              title="Exporter la sélection"
              aria-label="Exporter la sélection"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
            >
              <Download size={16} />
              <ChevronDown size={12} className="sp-export-caret" />
            </button>

            {exportOpen && (
              <div className="sp-export-menu" role="menu">
                <button type="button" role="menuitem" onClick={handleExportExcel} disabled={exporting}>
                  <FileSpreadsheet size={16} className="sp-export-ico excel" />
                  <span>
                    <strong>Excel</strong>
                    <small>.xlsx · toutes les colonnes</small>
                  </span>
                </button>
                <button type="button" role="menuitem" onClick={handleExportPdf} disabled={exporting}>
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
            <span className="sp-filters-count">
              {activeFilters} filtre{activeFilters > 1 ? 's' : ''} actif{activeFilters > 1 ? 's' : ''}
            </span>
            <button type="button" className="sp-link" onClick={clearAll}>Tout effacer</button>
          </div>
        )}
      </div>

      {(error || actionError) && <div className="alert bad" role="alert">{actionError || error.message}</div>}
      {notice && <div className="alert ok" role="status">{notice}</div>}
      {data?.truncated && <div className="alert bad">Seuls les 2000 derniers règlements sont affichés. Affinez les filtres.</div>}

      {/* ========== TABLEAU DES RÈGLEMENTS ========== */}
      {loading && !data ? (
        <div className="sp-empty">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="sp-empty">
          <Wallet size={36} />
          {activeFilters > 0 ? (
            <>
              <h3>Aucun résultat pour ces filtres</h3>
              <p>Essayez d'élargir votre recherche.</p>
              <button className="btn" onClick={clearAll}>Effacer les filtres</button>
            </>
          ) : (
            <>
              <h3>Aucun règlement ici</h3>
              <p>Enregistrez un virement ou un chèque, il apparaîtra dans le mois correspondant.</p>
              <button className="btn" onClick={() => setForm({})}>Nouveau règlement</button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className={`sp-table-container ${loading ? 'is-loading' : ''}`} ref={tableRef}>
            <table className="sp-table">
              <colgroup>
                <col style={{ width: 46 }} />
                <col style={{ width: 104 }} />
                <col style={{ width: 210 }} />
                <col style={{ width: 230 }} />
                <col style={{ width: 170 }} />
                <col />
                <col style={{ width: 230 }} />
                <col style={{ width: 112 }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="sp-th-n" aria-hidden="true" />
                  {COLUMNS.map((c) => {
                    const on = sort.key === c.key;
                    const SortIcon = on ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                    return (
                      <th key={c.key} className={on ? 'sorted' : ''} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button
                          type="button"
                          className="sp-th-btn"
                          onClick={() => toggleSort(c.key)}
                          title={`Trier par ${c.label.toLowerCase()}`}
                        >
                          <span>{c.label}</span>
                          <SortIcon size={13} />
                        </button>
                      </th>
                    );
                  })}
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.ym}>
                    <tr className="sp-table-month">
                      <td colSpan={8}>
                        <div className="sp-month-bar">
                          <h3>{monthLabel(g.ym)}</h3>
                          <span>{g.rows.length} règlement{g.rows.length > 1 ? 's' : ''}</span>
                          <b>{fmtAmount(g.total)} <small>TND</small></b>
                        </div>
                      </td>
                    </tr>

                    {g.rows.map((p, i) => {
                      const pending = p.status === 'pending';
                      const cancelled = p.status === 'cancelled';
                      const isSel = selected.has(p.id);
                      const modeLabel = `${METHODS[p.method]?.label ?? p.method}${p.reference ? ` N°${p.reference}` : ''}`;
                      return (
                        <tr
                          key={p.id}
                          tabIndex={0}
                          aria-selected={isSel}
                          className={`sp-row-data ${i % 2 ? 'alt' : ''} ${pending ? 'pending' : ''} ${cancelled ? 'cancelled' : ''} ${isSel ? 'selected' : ''}`}
                          onClick={(e) => selectRow(p, e)}
                          onDoubleClick={() => setForm({ payment: p })}
                          onKeyDown={(e) => onRowKey(e, p)}
                        >
                          <td className="sp-td-n">{g.start + i + 1}</td>
                          <td className="sp-td-date">{p.paid_on.split('-').reverse().join('/')}</td>
                          <td className="sp-td-supplier">{p.supplier_name}</td>
                          <td className="sp-td-method">
                            <div className="sp-mode" style={{ '--c': METHOD_COLORS[p.method] ?? 'var(--m-other)' }}>
                              <i aria-hidden="true" />
                              <span>{modeLabel}</span>
                            </div>
                            {(p.bank || pending || cancelled || (p.status === 'cleared' && p.method === 'cheque')) && (
                              <div className="sp-mode-sub">
                                {p.bank && <span>{p.bank}</span>}
                                {pending && <span className="sp-pill pending">À encaisser</span>}
                                {p.status === 'cleared' && p.method === 'cheque' && <span className="sp-pill cleared">Encaissé</span>}
                                {cancelled && <span className="sp-pill cancelled">Annulé</span>}
                              </div>
                            )}
                          </td>
                          <td className="sp-td-amount">{fmtAmount(p.amount_millimes)}</td>
                          <td className="sp-td-label">{p.label || ''}</td>
                          <td className="sp-td-invoices">{(p.sales_invoices ?? []).join(' / ')}</td>
                          <td className="sp-td-actions">
                            <div className="sp-acts">
                              {p.method === 'cheque' && pending && (
                                <button
                                  type="button"
                                  className="sp-icon-btn ok"
                                  title="Marquer comme encaissé"
                                  aria-label="Marquer comme encaissé"
                                  disabled={busyId === p.id}
                                  onClick={(e) => { e.stopPropagation(); markCleared(p); }}
                                ><Check size={17} /></button>
                              )}
                              <button
                                type="button"
                                className="sp-icon-btn"
                                title="Modifier"
                                aria-label={`Modifier le règlement de ${p.supplier_name}`}
                                onClick={(e) => { e.stopPropagation(); setForm({ payment: p }); }}
                              ><Pencil size={16} /></button>
                              <button
                                type="button"
                                className="sp-icon-btn danger"
                                title="Supprimer"
                                aria-label={`Supprimer le règlement de ${p.supplier_name}`}
                                onClick={(e) => { e.stopPropagation(); remove(p); }}
                              ><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Barre d'état façon Excel : nombre de lignes et somme */}
          <div className={`sp-statusbar ${selectedRows.length ? 'has-sel' : ''}`} role="status">
            {selectedRows.length > 0 ? (
              <>
                <span><b>{selectedRows.length}</b> ligne{selectedRows.length > 1 ? 's' : ''} sélectionnée{selectedRows.length > 1 ? 's' : ''}</span>
                <span>Somme : <b>{fmtAmount(sumOf(selectedRows))}</b> TND</span>
                <button type="button" className="sp-link" onClick={() => setSelected(new Set())}>Désélectionner</button>
              </>
            ) : (
              <>
                <span><b>{items.length}</b> règlement{items.length > 1 ? 's' : ''}</span>
                <span>Total : <b>{fmtAmount(sumOf(items))}</b> TND</span>
                <span className="hint">Clic : sélectionner · Ctrl/Maj + clic : plusieurs lignes · Double-clic : modifier</span>
              </>
            )}
          </div>
        </>
      )}

      {form && (
        <PaymentForm
          payment={form.payment}
          meta={meta}
          defaults={form.defaults}
          onClose={() => setForm(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}