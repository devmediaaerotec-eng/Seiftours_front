import { cn } from '@/lib/cn';

const TONES = {
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warn: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  bad: 'bg-red-50 text-red-700 ring-red-600/20',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  teal: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  gold: 'bg-gold-50 text-gold-800 ring-gold-500/30',
  muted: 'bg-slate-100 text-slate-600 ring-slate-500/15',
};
const DOTS = {
  ok: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-red-500', info: 'bg-sky-500',
  teal: 'bg-brand-500', gold: 'bg-gold-500', muted: 'bg-slate-400',
};

export default function Badge({ tone = 'muted', dot = false, className, children }) {
  const t = TONES[tone] ? tone : 'muted';
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[t], className)}>
      {dot && <span className={cn('size-1.5 rounded-full', DOTS[t])} />}
      {children}
    </span>
  );
}