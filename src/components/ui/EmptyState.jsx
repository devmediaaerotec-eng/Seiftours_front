import { Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function EmptyState({ icon: Icon = Inbox, title = 'Aucun résultat', text, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="size-6" />
      </span>
      <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}