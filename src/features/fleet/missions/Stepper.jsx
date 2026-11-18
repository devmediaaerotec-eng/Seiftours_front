import { Check } from 'lucide-react';

/** steps = [{ key, label }], current = index actif, reached = index max atteint. */
export default function Stepper({ steps, current, reached, onGo }) {
  return (
    <nav className="stp" aria-label="Étapes de création">
      <ol>
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const clickable = i <= reached && !active;
          return (
            <li key={s.key} className={`stp-item ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
              <button type="button" className="stp-btn" disabled={!clickable}
                      aria-current={active ? 'step' : undefined} onClick={() => onGo(i)}>
                <span className="stp-dot">{done ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                <span className="stp-label">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}