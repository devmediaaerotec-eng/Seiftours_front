import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

// Les <input>, <select> et <textarea> sont stylés globalement (index.css).
export default function Field({ label, error, hint, className, children }) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-sm', className)}>
      {label ? <span className="font-medium text-slate-700">{label}</span> : null}
      {children}
      {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
      {error && (
        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="size-3.5 shrink-0" /> {error.message}
        </span>
      )}
    </label>
  );
}