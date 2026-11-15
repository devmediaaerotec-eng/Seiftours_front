import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useCancelSeries } from './resource';

export default function CancelSeries({ mission, series }) {
  const toast = useToast();
  const cancel = useCancelSeries();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState('from_here');
  const [note, setNote] = useState('');

  if (!mission.series_ref || !(Number(series?.planned) > 0)) return null;

  const submit = async () => {
    try {
      const res = await cancel.mutateAsync({ ref: mission.series_ref, scope, mission_id: mission.id, note });
      toast.success(`${res.cancelled} mission(s) annulée(s)` + (res.skipped ? ` (${res.skipped} ignorée(s) : déjà effectuées ou en cours)` : '') + '. Pensez à renvoyer le programme.');
      setOpen(false);
      setNote('');
    } catch (e) {
      toast.error(e.data?.violations ? Object.values(e.data.violations)[0] : e.message);
    }
  };

  if (!open) {
    return <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>Annuler la série</button>;
  }

  return (
    <div className="card" style={{ padding: 12 }}>
      <p className="muted">
        Série de {series.total} missions ({series.first_day} → {series.last_day}), dont {series.planned} planifiée(s).
      </p>
      <label style={{ display: 'flex', gap: 6 }}>
        <input type="radio" checked={scope === 'from_here'} onChange={() => setScope('from_here')} />
        Ce jour et les suivants
      </label>
      <label style={{ display: 'flex', gap: 6 }}>
        <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} />
        Toute la série
      </label>
      <textarea rows="2" placeholder="Raison de l'annulation *" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="modal-actions" style={{ marginTop: 10 }}>
        <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>Retour</button>
        <button type="button" className="btn sm" disabled={cancel.isPending || note.trim().length < 3} onClick={submit}>
          Confirmer l'annulation
        </button>
      </div>
    </div>
  );
}