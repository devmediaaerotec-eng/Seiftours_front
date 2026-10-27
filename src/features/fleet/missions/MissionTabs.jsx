import { CalendarDays, ClipboardCheck, List } from 'lucide-react';
import { NavTabs } from '@/components/ui/Tabs';

const TABS = [
  { to: '/fleet/missions', label: 'Programme de la semaine', icon: CalendarDays, end: true },
  { to: '/fleet/missions/control', label: 'Contrôle du jour', icon: ClipboardCheck },
  { to: '/fleet/missions/list', label: 'Toutes les missions', icon: List },
];

export default function MissionTabs() {
  return <NavTabs items={TABS} />;
}