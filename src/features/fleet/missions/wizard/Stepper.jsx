import { Check } from 'lucide-react';

export default function Stepper({ steps, current, reached, onGo }) {
  return (
    <ol className="wz-steps" aria-label="Étapes de création">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={s.key} className={`wz-step ${state}`} aria-current={i === current ? 'step' : undefined}>
            <button type="button" disabled={i > reached} onClick={() => onGo(i)}>
              <span className="wz-dot">{state === 'done' ? <Check size={15} strokeWidth={3} /> : i + 1}</span>
              <span className="wz-label">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}