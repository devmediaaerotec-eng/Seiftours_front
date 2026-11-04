import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { METHODS, fmtAmount, monthLabel } from './model';

/* ---------- Utilitaires communs ---------- */

const formatDateFR = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const getMethodLabel = (m) => METHODS[m]?.label ?? m;
const getStatusLabel = (status) =>
  status === 'pending' ? 'En attente'
  : status === 'cancelled' ? 'Annulé'
  : 'Réglé';

/** Construit le libellé de la période active pour les titres */
const buildPeriodLabel = ({ year, month, supplier, status, q }) => {
  const parts = [];
  if (month) parts.push(`${monthLabel(`${year}-${String(month).padStart(2, '0')}`)} ${year}`);
  else parts.push(`Année ${year}`);
  if (supplier) parts.push(`Fournisseur : ${supplier}`);
  if (status === 'pending') parts.push('Chèques en attente');
  if (q) parts.push(`Recherche : « ${q} »`);
  return parts.join(' · ');
};

/* ---------- EXPORT EXCEL ---------- */

export function exportToExcel(items, { year, month, supplier, status, q }) {
  if (!items?.length) {
    throw new Error('Aucun règlement à exporter.');
  }

  const rows = items.map((p) => ({
    Date: formatDateFR(p.paid_on),
    Fournisseur: p.supplier_name,
    Libellé: p.label || '',
    Mode: getMethodLabel(p.method),
    Référence: p.reference || '',
    Banque: p.bank || '',
    Statut: getStatusLabel(p.status),
    'Factures': (p.sales_invoices || []).join(', '),
    'Montant (TND)': p.amount_millimes / 1000,
    Remarque: p.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Largeurs de colonnes
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 28 }, // Fournisseur
    { wch: 34 }, // Libellé
    { wch: 14 }, // Mode
    { wch: 16 }, // Référence
    { wch: 18 }, // Banque
    { wch: 12 }, // Statut
    { wch: 22 }, // Factures
    { wch: 16 }, // Montant
    { wch: 28 }, // Remarque
  ];

  // Formatage du montant en nombre
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 8 })]; // colonne 8 = Montant
    if (cell) cell.z = '#,##0.000';
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Règlements');

  const filename = `reglements_${year}${month ? '-' + String(month).padStart(2, '0') : ''}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/* ---------- EXPORT PDF ---------- */

export function exportToPdf(items, { year, month, supplier, status, q, summary }) {
  if (!items?.length) {
    throw new Error('Aucun règlement à exporter.');
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // En-tête
  doc.setFontSize(16);
  doc.setTextColor('#06303a');
  doc.text('Règlements fournisseurs', 14, 16);

  doc.setFontSize(10);
  doc.setTextColor('#5d7a83');
  doc.text(buildPeriodLabel({ year, month, supplier, status, q }), 14, 22);

  // Résumé
  if (summary) {
    doc.setFontSize(11);
    doc.setTextColor('#06303a');
    doc.text(
      `${summary.count} règlement${summary.count > 1 ? 's' : ''} · Total : ${fmtAmount(summary.total)} TND`,
      14,
      29
    );
  }

  // Table
  const head = [['Date', 'Fournisseur', 'Libellé', 'Mode', 'Référence', 'Banque', 'Statut', 'Factures', 'Montant (TND)']];

  const body = items.map((p) => [
    formatDateFR(p.paid_on),
    p.supplier_name,
    p.label || '',
    getMethodLabel(p.method),
    p.reference || '',
    p.bank || '',
    getStatusLabel(p.status),
    (p.sales_invoices || []).join(', '),
    fmtAmount(p.amount_millimes),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 34,
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: '#06303a',
      lineColor: '#dce7ea',
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: '#0a7c95',
      textColor: '#ffffff',
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: '#eaf3f5',
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 40 },
      2: { cellWidth: 50 },
      3: { cellWidth: 22 },
      4: { cellWidth: 28 },
      5: { cellWidth: 28 },
      6: { cellWidth: 22 },
      7: { cellWidth: 30 },
      8: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Pied de page
      const pageCount = doc.internal.getNumberOfPages();
      const current = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor('#5d7a83');
      doc.text(
        `Page ${current} / ${pageCount}`,
        doc.internal.pageSize.getWidth() - 20,
        doc.internal.pageSize.getHeight() - 8
      );
      doc.text(
        `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
        14,
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  const filename = `reglements_${year}${month ? '-' + String(month).padStart(2, '0') : ''}.pdf`;
  doc.save(filename);
}