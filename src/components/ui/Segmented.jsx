import { cn } from '@/lib/cn';

/** options = [[valeur, libellé], ...] */
export default function Segmented({ options, value, onChange, size = 'md', className }) {
  return (
    <div role="group" className={cn('inline-flex rounded-lg bg-slate-100 p-0.5', className)}>
      {options.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}
                className={cn(
                  'rounded-md px-3 text-[13px] font-medium transition',
                  size === 'sm' ? 'py-1' : 'py-1.5',
                  v === value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                )}>
          {label}
        </button>
      ))}
    </div>
  );
}