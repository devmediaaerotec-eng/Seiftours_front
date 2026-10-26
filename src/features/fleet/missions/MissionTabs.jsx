import { NavLink } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, List } from 'lucide-react';

const TABS = [
  { to: '/fleet/missions', label: 'Programme de la semaine', icon: CalendarDays, end: true },
  { to: '/fleet/missions/control', label: 'Contrôle du jour', icon: ClipboardCheck },
  { to: '/fleet/missions/list', label: 'Toutes les missions', icon: List },
];

export default function MissionTabs() {
  return (
    <nav className="subtabs">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `subtab ${isActive ? 'active' : ''}`}>
          <Icon size={16} /> {label}
        </NavLink>
      ))}
    </nav>
  );
}