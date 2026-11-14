import { LIVE, liveState } from '../shared/liveState';

export default function MissionBadges({ m, now }) {
  const s = LIVE[liveState(m, now)] ?? LIVE.upcoming;
  return (
    <span className="badges">
      <span className={`badge ${s.cls}`}>{s.label}</span>
      {m.needs_control && <span className="badge warn">À contrôler</span>}
      {m.changes_count > 0 && <span className="badge info" title="Modifiée depuis sa création">Modifiée</span>}
    </span>
  );
}