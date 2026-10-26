import { MISSION_STATUS } from '../shared/status';

export default function MissionBadges({ m }) {
  const s = MISSION_STATUS[m.status];
  return (
    <span className="badges">
      <span className={`badge ${s.cls}`}>{s.label}</span>
      {m.needs_control && <span className="badge warn">À contrôler</span>}
      {m.changes_count > 0 && <span className="badge info" title="Modifiée depuis sa création">Modifiée</span>}
    </span>
  );
}