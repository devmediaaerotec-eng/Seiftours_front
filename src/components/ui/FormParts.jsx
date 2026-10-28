import { cn } from '@/lib/cn';

export function FormSection({ icon: Icon, title, description, className, children }) {
  return (
    <section className={cn('mt-7 first:mt-0', className)}>
      <div className="mb-3.5 flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
        {Icon && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function FormGrid({ className, children }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>;
}

/** Reste visible en bas de la fenêtre pendant le défilement du formulaire. */
export function FormActions({ children }) {
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 mt-7 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
      {children}
    </div>
  );
}