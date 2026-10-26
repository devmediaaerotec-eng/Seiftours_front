import { BellRing, ClipboardCheck, Clock, FileText, Gauge, Route, Send, Timer, WifiOff, Wrench } from 'lucide-react';

export const ALERT_TYPE = {
  document_expiring: { label: 'Document', icon: FileText },
  control_overdue:   { label: 'Contrôle en retard', icon: ClipboardCheck },
  program_unsent:    { label: 'Programme non envoyé', icon: Send },
  late_departure:    { label: 'Départ en retard', icon: Clock },
  route_deviation:   { label: 'Écart de trajet', icon: Route },
  speeding:          { label: 'Excès de vitesse', icon: Gauge },
  stopped_too_long:  { label: 'Arrêt prolongé', icon: Timer },
  no_signal:         { label: 'Signal perdu', icon: WifiOff },
  sos:               { label: 'SOS', icon: BellRing },
  incident:          { label: 'Incident', icon: Wrench },
};

export const SEVERITY = {
  critical: { label: 'Critique', cls: 'bad' },
  warning:  { label: 'Attention', cls: 'warn' },
  info:     { label: 'Info', cls: 'info' },
};