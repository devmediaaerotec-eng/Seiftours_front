import { FileText } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fmtDate } from '@/lib/format';

const TONE = {
  ok: 'bg-emerald-50/70 text-emerald-800 ring-emerald-600/15',
  soon: 'bg-amber-50 text-amber-900 ring-amber-600/25',
  expired: 'bg-red-50 text-red-800 ring-red-600/20',
  none: 'bg-slate-50 text-slate-500 ring-slate-200',
};

export default function DocBadge({ label, date, doc, icon: Icon = FileText, className }) {
  const state = !date || !doc ? 'none' : doc.state;
  const hint =
    state === 'none' ? 'Non renseignée'
    : state === 'expired' ? `Expirée depuis ${-doc.days} j`
    : doc.days === 0 ? "Expire aujourd'hui"
    : state === 'soon' ? `Dans ${doc.days} j`
    : 'Valide';

  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs ring-1 ring-inset', TONE[state], className)}>
      <span className="flex items-center gap-1.5 font-medium"><Icon className="size-3.5 shrink-0" /> {label}</span>
      <span className="flex flex-col items-end leading-tight">
        <span className="whitespace-nowrap font-semibold">{date ? fmtDate(date) : '—'}</span>
        <span className="whitespace-nowrap opacity-80">{hint}</span>
      </span>
    </div>
  );
}