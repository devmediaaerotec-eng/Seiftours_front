export default function StatCards({ items }) {
  return (
    <div className="stats five">
      {items.map((s) => (
        <button key={s.label} type="button" className={`card stat ${s.active ? 'selected' : ''}`} onClick={s.onClick}>
          <span className="muted">{s.label}</span>
          <strong className={s.tone ? `tone-${s.tone}` : ''}>{s.value ?? '…'}</strong>
        </button>
      ))}
    </div>
  );
}