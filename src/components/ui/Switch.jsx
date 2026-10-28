import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const Switch = forwardRef(function Switch({ label, description, className, ...props }, ref) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-3', className)}>
      <span className="relative inline-flex shrink-0">
        <input ref={ref} type="checkbox" role="switch" className="peer sr-only" {...props} />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      {(label || description) && (
        <span className="min-w-0 text-sm">
          {label && <span className="block font-medium text-slate-800">{label}</span>}
          {description && <span className="block text-xs text-slate-500">{description}</span>}
        </span>
      )}
    </label>
  );
});

export default Switch;