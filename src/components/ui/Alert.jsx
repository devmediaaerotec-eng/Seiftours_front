import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

const TONES = {
  bad: ['bg-red-50 text-red-800 ring-red-600/20', AlertCircle],
  warn: ['bg-amber-50 text-amber-900 ring-amber-600/25', AlertTriangle],
  ok: ['bg-emerald-50 text-emerald-800 ring-emerald-600/20', CheckCircle2],
  info: ['bg-sky-50 text-sky-800 ring-sky-600/20', Info],
};

export default function Alert({ tone = 'info', title, children, className }) {
  const [cls, Icon] = TONES[tone] ?? TONES.info;
  return (
    <div role={tone === 'bad' ? 'alert' : 'status'} className={cn('mb-4 flex items-start gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset', cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}