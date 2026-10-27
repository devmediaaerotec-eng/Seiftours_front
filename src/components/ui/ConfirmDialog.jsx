import { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  /** confirm('Supprimer ?')  ou  confirm({ title, message, confirmLabel, tone: 'danger' })  →  Promise<boolean> */
  const confirm = useCallback(
    (opts) => new Promise((resolve) => setState({ opts: typeof opts === 'string' ? { message: opts } : opts, resolve })),
    []
  );
  const close = (value) => { state.resolve(value); setState(null); };
  const o = state?.opts ?? {};
  const danger = o.tone !== 'primary';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <Modal title={o.title ?? 'Confirmation'} size="sm" onClose={() => close(false)}>
          <div className="flex gap-4">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'}`}>
              <AlertTriangle className="size-5" />
            </span>
            <p className="pt-1.5 text-sm text-slate-600">{o.message}</p>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => close(false)}>Annuler</Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={() => close(true)}>{o.confirmLabel ?? 'Confirmer'}</Button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);