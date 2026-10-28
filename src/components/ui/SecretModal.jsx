import { useState } from 'react';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import { useToast } from './Toast';

export default function SecretModal({ title, intro, rows = [], secret, onClose }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success('Copié.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copie impossible : recopiez à la main.');
    }
  };

  return (
    <Modal title={title} size="sm" onClose={onClose}>
      <p className="text-sm leading-relaxed text-slate-600">{intro}</p>

      {rows.length > 0 && (
        <dl className="mt-4 divide-y divide-slate-100 rounded-lg bg-slate-50 px-4 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="text-slate-500">{k}</dt>
              <dd className="min-w-0 break-all text-right font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-5 rounded-xl border border-dashed border-gold-400 bg-gold-50 px-4 py-5 text-center">
        <p className="select-all break-all font-mono text-2xl font-bold tracking-widest text-slate-900 sm:text-3xl">{secret}</p>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-inset ring-amber-600/20">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        Ce code ne sera plus affiché après la fermeture de cette fenêtre. Copiez-le maintenant.
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy} className="w-full sm:w-auto">{copied ? 'Copié' : 'Copier'}</Button>
        <Button onClick={onClose} className="w-full sm:w-auto">Fermer</Button>
      </div>
    </Modal>
  );
}