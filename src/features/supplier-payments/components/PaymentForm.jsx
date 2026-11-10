import { useEffect, useRef, useState } from 'react';
import { Banknote, FileText, Landmark, MoreHorizontal, X } from 'lucide-react';
import { METHODS, emptyForm, fromApi, toApi, validate, fmtAmount } from '../model';
import { savePayment } from '../paymentsApi';
import Slip from './Slip';
import { METHOD_COLORS } from './Overview';

const ICONS = { transfer: Landmark, cheque: FileText, cash: Banknote, other: MoreHorizontal };

function Field({ id, label, error, children, className = '' }) {
  return (
    <div className={`sp-f ${error ? 'bad' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <span className="err" role="alert">{error}</span>}
    </div>
  );
}

/** Saisie des factures de vente : Entrée ou virgule ajoute, Retour arrière retire la dernière */
function InvoiceInput({ value, onChange }) {
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim().replace(/,$/, '');
    if (v && !value.includes(v)) onChange([...value, v]);
    setText('');
  };
  return (
    <div className="sp-chipbox" onClick={(e) => e.currentTarget.querySelector('input').focus()}>
      {value.map((v) => (
        <span key={v} className="sp-tag">{v}<button type="button" aria-label={`Retirer ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>×</button></span>
      ))}
      <input
        id="sp-inv" value={text} placeholder={value.length ? '' : 'FAC N°00548 puis Entrée'}
        onChange={(e) => setText(e.target.value)} onBlur={add}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
      />
    </div>
  );
}

export default function PaymentForm({ payment, meta, defaults, onClose, onSaved }) {
  const editing = !!payment;
  const [f, setF] = useState(() => (editing ? fromApi(payment) : emptyForm(defaults)));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [duplicate, setDuplicate] = useState('');
  const [saving, setSaving] = useState(false);
  const first = useRef(null);

  useEffect(() => { first.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: '' })); setDuplicate(''); };
  const pickMethod = (m) => setF((s) => ({ ...s, method: m, status: editing && s.status === 'cancelled' ? 'cancelled' : m === 'cheque' ? 'pending' : 'cleared' }));
  const needsRef = f.method === 'transfer' || f.method === 'cheque';

  const submit = async (another = false, confirmDuplicate = false) => {
    setFormError('');
    const local = validate(f);
    setErrors({ ...local, amount: local.amount_millimes });
    if (Object.keys(local).length) return;
    setSaving(true);
    try {
      const saved = await savePayment(payment?.id, { ...toApi(f), ...(confirmDuplicate ? { confirm_duplicate: true } : {}) });
      onSaved(saved, another ? { method: f.method, paid_on: f.paid_on, bank: f.bank, status: f.method === 'cheque' ? 'pending' : 'cleared' } : null);
      if (another) { setF(emptyForm({ method: f.method, paid_on: f.paid_on, bank: f.bank, status: f.method === 'cheque' ? 'pending' : 'cleared' })); first.current?.focus(); }
    } catch (err) {
      if (err.status === 409 && err.data?.error === 'duplicate') setDuplicate(err.data.message);
      else { setErrors({ ...(err.data?.violations ?? {}), amount: err.data?.violations?.amount_millimes }); setFormError(err.message); }
    } finally { setSaving(false); }
  };

  return (
    <div className="sp sp-ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sp-panel" role="dialog" aria-modal="true" aria-label={editing ? 'Modifier le règlement' : 'Nouveau règlement'}
        onSubmit={(e) => { e.preventDefault(); submit(false); }} noValidate>
        <header>
          <h2>{editing ? 'Modifier le règlement' : 'Nouveau règlement'}</h2>
          <button type="button" className="btn ghost sm" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </header>

        <div className="sp-body">
          <div className="sp-col sp-col-a">
          <Slip f={f} />

          <div>
            <div className="sp-f"><span className="l">Mode de règlement</span></div>
            <div className="sp-seg" role="radiogroup" aria-label="Mode de règlement" style={{ marginTop: '.4rem' }}>
              {Object.entries(METHODS).map(([k, m]) => {
                const Icon = ICONS[k];
                return (
                  <button key={k} type="button" role="radio" aria-checked={f.method === k} className={f.method === k ? 'on' : ''} style={{ '--c': METHOD_COLORS[k] }} onClick={() => pickMethod(k)}>
                    <span className="sp-medal"><Icon size={18} /></span>{m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {(f.method === 'transfer' || f.method === 'cheque') && (
            <div className="sp-two">
              <Field id="sp-bank" label="Banque">
                <input id="sp-bank" list="sp-banks" value={f.bank} onChange={set('bank')} autoComplete="off" />
                <datalist id="sp-banks">{meta.banks.map((b) => <option key={b} value={b} />)}</datalist>
              </Field>
              <Field id="sp-st" label="Statut">
                <select id="sp-st" value={f.status} onChange={set('status')}>
                  <option value="cleared">{f.method === 'cheque' ? 'Encaissé' : 'Réglé'}</option>
                  <option value="pending">En attente</option>
                  {editing && <option value="cancelled">Annulé</option>}
                </select>
              </Field>
            </div>
          )}

          <Field id="sp-notes" label="Remarque interne">
            <textarea id="sp-notes" rows={2} value={f.notes} onChange={set('notes')} />
          </Field>

          </div>
          <div className="sp-col sp-col-b">
          <div className="sp-two">
            <Field id="sp-date" label="Date *" error={errors.paid_on}>
              <input id="sp-date" type="date" value={f.paid_on} onChange={set('paid_on')} />
            </Field>
            <Field id="sp-ref" label={METHODS[f.method].ref + (needsRef ? ' *' : '')} error={errors.reference}>
              <input id="sp-ref" value={f.reference} onChange={set('reference')} inputMode={needsRef ? 'numeric' : 'text'} autoComplete="off" />
            </Field>
          </div>

          <Field id="sp-sup" label="Fournisseur *" error={errors.supplier_name}>
            <input id="sp-sup" ref={first} list="sp-suppliers" value={f.supplier_name} onChange={set('supplier_name')} autoComplete="off" placeholder="ELL JABER VOYAGE" />
            <datalist id="sp-suppliers">{meta.suppliers.map((s) => <option key={s.name} value={s.name} />)}</datalist>
          </Field>

          <Field id="sp-amt" label="Montant *" error={errors.amount_millimes ?? errors.amount}>
            <div className="sp-amount">
              <input id="sp-amt" value={f.amount} onChange={set('amount')} inputMode="decimal" placeholder="0,000" autoComplete="off" />
              <span>TND</span>
            </div>
          </Field>

          <Field id="sp-lbl" label="Libellé">
            <input id="sp-lbl" value={f.label} onChange={set('label')} placeholder="REGLEMENT FACTURE MILI HASSEN" />
          </Field>

          <Field id="sp-inv" label="Facture(s) de vente">
            <InvoiceInput value={f.sales_invoices} onChange={(v) => setF((s) => ({ ...s, sales_invoices: v }))} />
          </Field>

          {duplicate && (
            <div className="alert bad" role="alert">
              {duplicate}
              <div style={{ marginTop: '.5rem' }}><button type="button" className="btn sm" disabled={saving} onClick={() => submit(false, true)}>Enregistrer quand même</button></div>
            </div>
          )}
          {formError && !duplicate && <div className="alert bad" role="alert">{formError}</div>}
          </div>
        </div>

        <div className="sp-foot">
          {!editing && <button type="button" className="btn ghost" disabled={saving} onClick={() => submit(true)}>Enregistrer et ajouter un autre</button>}
          <span className="grow" />
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  );
}
