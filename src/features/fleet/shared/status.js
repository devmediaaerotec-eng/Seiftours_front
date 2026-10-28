import {
  Ban, Bus, BusFront, CalendarOff, CheckCircle2, Route, UserCheck, UserX, Wrench,
} from 'lucide-react';

export const BUS_STATUS = {
  available:      { label: 'Disponible',   cls: 'ok',   icon: CheckCircle2 },
  on_mission:     { label: 'En mission',   cls: 'info', icon: Route },
  maintenance:    { label: 'Maintenance',  cls: 'warn', icon: Wrench },
  out_of_service: { label: 'Hors service', cls: 'bad',  icon: Ban },
};

export const BUS_TYPE = {
  minibus:  { label: 'Minibus',  cls: 'teal', icon: Bus },
  microbus: { label: 'Microbus', cls: 'gold', icon: BusFront },
};

export const DRIVER_STATUS = {
  active:    { label: 'Actif',    cls: 'ok',   icon: UserCheck },
  on_leave:  { label: 'En congé', cls: 'warn', icon: CalendarOff },
  suspended: { label: 'Suspendu', cls: 'bad',  icon: UserX },
};

export const MISSION_STATUS = {
  planned:     { label: 'Planifiée',     cls: 'teal' },
  in_progress: { label: 'En cours',      cls: 'gold' },
  completed:   { label: 'Effectuée',     cls: 'ok' },
  not_done:    { label: 'Non effectuée', cls: 'bad' },
  cancelled:   { label: 'Annulée',       cls: 'muted' },
};

export const MISSION_TYPE = {
  rental: 'Location', transfer: 'Transfert', excursion: 'Excursion',
  circuit: 'Circuit', shuttle: 'Navette', other: 'Autre',
};