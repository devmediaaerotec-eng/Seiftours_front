export const BUS_STATUS = {
  available:      { label: 'Disponible',   cls: 'ok' },
  on_mission:     { label: 'En mission',   cls: 'info' },
  maintenance:    { label: 'Maintenance',  cls: 'warn' },
  out_of_service: { label: 'Hors service', cls: 'bad' },
};

export const DRIVER_STATUS = {
  active:    { label: 'Actif',    cls: 'ok' },
  on_leave:  { label: 'En congé', cls: 'warn' },
  suspended: { label: 'Suspendu', cls: 'bad' },
};

export const BUS_TYPE = {
  minibus:  { label: 'Minibus',  cls: 'teal' },
  microbus: { label: 'Microbus', cls: 'gold' },
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