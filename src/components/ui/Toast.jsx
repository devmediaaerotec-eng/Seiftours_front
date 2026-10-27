import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);
const KINDS = {
  ok: { icon: CheckCircle2, color: 'text-emerald-500' },
  bad: { icon: XCircle, color: 'text-red-500' },
  warn: { icon: AlertTriangle, color: 'text-amber-500' },
  info: { icon: Info, color: 'text-sky-500' },
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((kind, message, ms = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l.slice(-3), { id, kind, message }]);
    setTimeout(() => dismiss(id), ms);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push('ok', m),
    error: (m) => push('bad', m, 6500),
    warn: (m) => push('warn', m, 9000),
    info: (m) => push('info', m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-end gap-2 p-4 sm:p-6">
        {items.map((t) => {
          const K = KINDS[t.kind];
          return (
            <div key={t.id} role="status"
                 className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-900/10">
              <K.icon className={`mt-0.5 size-5 shrink-0 ${K.color}`} />
              <p className="flex-1 text-sm text-slate-700">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Fermer" className="text-slate-300 hover:text-slate-500">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);