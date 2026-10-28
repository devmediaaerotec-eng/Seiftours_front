import { cn } from '@/lib/cn';

const VALUE = { warn: 'text-amber-600', bad: 'text-red-600', ok: 'text-emerald-600' };
const ICON = {
  default: 'bg-brand-50 text-brand-600', warn: 'bg-amber-50 text-amber-600',
  bad: 'bg-red-50 text-red-600', ok: 'bg-emerald-50 text-emerald-600',
};

export default function StatCards({ items }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
      {items.map((s) => {
        const Tag = s.onClick ? 'button' : 'div';
        const Icon = s.icon;
        return (
          <Tag
            key={s.label}
            {...(s.onClick ? { type: 'button', onClick: s.onClick } : {})}
            className={cn(
              'rounded-xl bg-white p-4 text-left shadow-sm ring-1 transition last:odd:col-span-2 sm:last:odd:col-span-1',
              s.active ? 'ring-2 ring-brand-500' : 'ring-slate-200/70',
              s.onClick && 'cursor-pointer hover:ring-brand-300'
            )}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium leading-snug text-slate-500 sm:text-[13px]">{s.label}</span>
              {Icon && (
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', ICON[s.tone] ?? ICON.default)}>
                  <Icon className="size-4" />
                </span>
              )}
            </span>
            <strong className={cn('mt-2 block text-2xl font-semibold tracking-tight text-slate-900', VALUE[s.tone])}>{s.value ?? '…'}</strong>
          </Tag>
        );
      })}
    </div>
  );
}