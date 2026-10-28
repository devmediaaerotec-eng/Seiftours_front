import { cn } from '@/lib/cn';

/** options = [{ value, label, description?, icon? }]  —  register = celui de react-hook-form */
export default function RadioCards({ name, register, rules, options, className = 'grid-cols-2' }) {
  return (
    <div className={cn('grid gap-3', className)}>
      {options.map((o) => (
        <label key={o.value} className="relative cursor-pointer">
          <input type="radio" value={o.value} className="peer sr-only" {...register(name, rules)} />
          <span className="flex h-full flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-slate-300 peer-checked:border-brand-500 peer-checked:bg-brand-50/60 peer-checked:ring-1 peer-checked:ring-brand-500 peer-checked:[&_svg]:text-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40">
            {o.icon && <o.icon className="size-5 text-slate-400" />}
            <span className="text-sm font-semibold text-slate-900">{o.label}</span>
            {o.description && <span className="text-xs leading-snug text-slate-500">{o.description}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}