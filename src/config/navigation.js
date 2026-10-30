import {
  LayoutDashboard, CalendarCheck, Plane, Route, Tag, MapPin,
  Radar, Bus, UserRound,Compass, BellRing, Users, Settings,Inbox,
} from 'lucide-react';

export const NAV = [
  { section: null, items: [
    { label: 'Tableau de bord', to: '/', icon: LayoutDashboard, end: true },
  ]},
  { section: 'Ventes', items: [
    { label: 'Réservations', to: '/bookings', icon: CalendarCheck, perm: 'bookings.read' },
  ]},
  { section: 'Catalogue', items: [
    { label: 'Voyages organisés', to: '/trips',        icon: Plane,  perm: 'trips.manage' },
    { label: 'Circuits',          to: '/circuits',     icon: Route,  perm: 'trips.manage' },
    { label: 'Bons plans',        to: '/deals',        icon: Tag,    perm: 'deals.manage' },
    { label: 'Destinations',      to: '/destinations', icon: MapPin, perm: 'destinations.manage' },
{ label: 'Régions de circuits', to: '/regions', icon: Compass, perm: 'destinations.manage' },  ]
},
  { section: 'Flotte', items: [
    { label: 'Suivi en direct', to: '/fleet/live',     icon: Radar,     perm: 'fleet.track' },
    { label: 'Missions',        to: '/fleet/missions', icon: Route,     perm: 'fleet.read' },
    { label: 'Bus',             to: '/fleet/buses',    icon: Bus,       perm: 'fleet.read' },
    { label: 'Chauffeurs',      to: '/fleet/drivers',  icon: UserRound, perm: 'fleet.read' },
    { label: 'Demandes de location', to: '/fleet/transport', icon: Inbox, perm: 'fleet.read' },
    { label: 'Alertes',         to: '/fleet/alerts',   icon: BellRing,  perm: 'alerts.read' },
  ]},
  { section: 'Administration', items: [
    { label: 'Personnel', to: '/staff',    icon: Users,    perm: 'staff.manage' },
    { label: 'Réglages',  to: '/settings', icon: Settings, perm: 'settings.manage' },
  ]},
];