import { cn } from '@/lib/cn';

const TONES = { warn: 'text-amber-600', bad: 'text-red-600', ok: 'text-emerald-600' };

export default function StatCards({ items }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
      {items.map((s) => {
        const Tag = s.onClick ? 'button' : 'div';
        return (
          <Tag
            key={s.label}
            {...(s.onClick ? { type: 'button', onClick: s.onClick } : {})}
            className={cn(
              'rounded-xl bg-white p-4 text-left shadow-sm ring-1 transition',
              s.active ? 'ring-2 ring-brand-500' : 'ring-slate-200/70',
              s.onClick && 'cursor-pointer hover:ring-brand-300'
            )}
          >
            <span className="block text-xs font-medium text-slate-500">{s.label}</span>
            <strong className={cn('mt-1 block text-2xl font-semibold tracking-tight text-slate-900', TONES[s.tone])}>{s.value ?? '…'}</strong>
          </Tag>
        );
      })}
    </div>
  );
}