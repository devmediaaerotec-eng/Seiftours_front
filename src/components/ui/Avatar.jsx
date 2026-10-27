import { cn } from '@/lib/cn';
import { assetUrl } from '@/lib/format';

const PALETTE = [
  'bg-brand-100 text-brand-700', 'bg-gold-100 text-gold-800', 'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-emerald-100 text-emerald-700',
];
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export default function Avatar({ src, name = '', size = 40, className }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  if (src) {
    return <img src={assetUrl(src)} alt={name} style={style} className={cn('shrink-0 rounded-full object-cover ring-1 ring-slate-200', className)} />;
  }
  return (
    <span style={style} className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', PALETTE[hash(name) % PALETTE.length], className)}>
      {initials || '?'}
    </span>
  );
}