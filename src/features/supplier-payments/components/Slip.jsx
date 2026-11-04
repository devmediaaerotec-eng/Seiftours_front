import { Banknote, FileText, Landmark, MoreHorizontal } from 'lucide-react';
import { METHODS, fmtAmount, fmtDate, parseAmount } from '../model';

const ICONS = { transfer: Landmark, cheque: FileText, cash: Banknote, other: MoreHorizontal };
const TITLES = { transfer: 'Virement bancaire', cheque: 'Chèque', cash: 'Reçu de caisse', other: 'Règlement' };

/** Le bordereau se redessine selon le mode choisi et se remplit pendant la saisie. */
export default function Slip({ f }) {
  const Icon = ICONS[f.method];
  const millimes = parseAmount(f.amount);
  const ref = f.reference.trim();
  return (
    <div className="sp-slip-wrap" aria-hidden="true">
      <div className={`sp-slip ${f.method}`} key={f.method}>
        {f.method === 'transfer' && <i className="stripe" />}
        <div className="top">
          <span><Icon size={16} />{TITLES[f.method]}{f.method !== 'cash' && f.bank.trim() ? `, ${f.bank.trim()}` : ''}</span>
          <span>{f.paid_on ? fmtDate(f.paid_on) : ''}</span>
        </div>

        <p className="to">{f.method === 'cheque' ? "Payez contre ce chèque à l'ordre de" : f.method === 'cash' ? 'Reçu par' : 'Bénéficiaire'}</p>
        <div className={`who ${f.supplier_name.trim() ? '' : 'ghost'}`}>{f.supplier_name.trim().toUpperCase() || 'NOM DU FOURNISSEUR'}</div>

        <div className="sum">
          <small>{f.label.trim() || 'Montant'}</small>
          <span className={`num ${millimes ? '' : 'ghost'}`}>{millimes ? fmtAmount(millimes) : '0,000'}<small> TND</small></span>
        </div>

        {f.sales_invoices.length > 0 && (
          <div className="meta">{f.sales_invoices.map((v) => <span key={v} className="sp-tag">{v}</span>)}</div>
        )}
        {f.method === 'cheque'
          ? <div className="micr">{ref ? `N° ${ref}` : 'N° ·······'}</div>
          : (f.method === 'transfer' && <div className="meta"><span>{METHODS.transfer.ref.replace('N° de virement', 'Référence')}</span><span className="ref">{ref || '·······'}</span></div>)}
      </div>
    </div>
  );
}
