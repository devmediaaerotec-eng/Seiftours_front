import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

export function FilterBar({ children, className }) {
  return <div className={cn('mb-4 flex flex-wrap items-center gap-3', className)}>{children}</div>;
}

export function SearchBox({ value, onChange, onSubmit, placeholder = 'Rechercher…' }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="relative min-w-64 flex-1 sm:max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input type="search" className="pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </form>
  );
}