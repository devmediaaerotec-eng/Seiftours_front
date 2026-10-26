import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/http';

export default function HotelPicker({ id, label, onPick, onClear, error }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data = [], isFetching } = useQuery({
    queryKey: ['deals', 'hotels', term],
    queryFn: () => api(`/admin/deals/hotels?q=${encodeURIComponent(term)}`),
    enabled: !id && term.length >= 2,
  });

  if (id) {
    return (
      <div className="picked">
        <strong>{label || `Hôtel n°${id}`}</strong>
        <button type="button" className="btn ghost sm" onClick={onClear}>Changer</button>
      </div>
    );
  }

  return (
    <div className="picker">
      <input placeholder="Rechercher un hôtel (2 lettres minimum)…" value={q} onChange={(e) => setQ(e.target.value)} />
      {term.length >= 2 && (
        <ul className="picker-list">
          {isFetching && <li className="muted">Recherche…</li>}
          {!isFetching && data.length === 0 && <li className="muted">Aucun hôtel trouvé dans le catalogue.</li>}
          {data.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => onPick({
                id: String(h.id),
                label: `${h.name}${h.city ? ` · ${h.city}` : ''}${h.stars ? ` · ${h.stars}★` : ''}`,
              })}>
                {h.name} <span className="muted">{h.city}{h.stars ? ` · ${h.stars}★` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <small className="field-error">{error.message}</small>}
    </div>
  );
}