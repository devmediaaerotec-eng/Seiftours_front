import { cn } from '@/lib/cn';

export function Card({ className, padded = true, children, ...props }) {
  return (
    <div className={cn('rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70', padded && 'p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function Panel({ title, icon: Icon, action, children, className, bodyClassName }) {
  return (
    <section className={cn('rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {Icon && <Icon className="size-4 text-slate-400" />}
          {title}
        </h3>
        {action}
      </header>
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}