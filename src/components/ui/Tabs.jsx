import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';

const wrap = 'mb-6 flex gap-1 overflow-x-auto border-b border-slate-200';
const item = (active) => cn(
  '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition',
  active ? 'border-gold-500 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
);

/** Onglets d'état local : items = [{ id, label, icon }] */
export function Tabs({ items, value, onChange }) {
  return (
    <nav className={wrap}>
      {items.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" onClick={() => onChange(id)} className={item(id === value)}>
          {Icon && <Icon className="size-4" />}{label}
        </button>
      ))}
    </nav>
  );
}

/** Onglets liés à des routes : items = [{ to, label, icon, end }] */
export function NavTabs({ items }) {
  return (
    <nav className={wrap}>
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => item(isActive)}>
          {Icon && <Icon className="size-4" />}{label}
        </NavLink>
      ))}
    </nav>
  );
}