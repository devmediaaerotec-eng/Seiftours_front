import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import BranchForm from './BranchForm';
import { branches } from './resource';

const DAY_SHORT = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 0: 'Dim' };

export default function BranchesPanel() {
  const toast = useToast();
  const list = branches.useList();
  const flags = branches.useFlags();
  const remove = branches.useRemove();
  const [editing, setEditing] = useState(undefined);
  const onError = (e) => toast.error(e.message);

  const del = (b) => {
    if (!window.confirm(`Supprimer l'agence ${b.name} ?`)) return;
    remove.mutate(b.id, { onSuccess: () => toast.success('Agence supprimée.'), onError });
  };

  return (
    <>
      <div className="row-tools" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn" onClick={() => setEditing(null)}><Plus size={16} /> Nouvelle agence</button>
      </div>
      {list.error && <div className="alert bad">{list.error.message}</div>}
      {list.isLoading && <div className="center">Chargement…</div>}

      <div className="branch-grid">
        {(list.data?.items ?? []).map((b) => (
          <div key={b.id} className={`card branch ${b.is_active ? '' : 'off'}`}>
            <div className="title-row">
              <div><strong style={{ fontSize: 17 }}>{b.name}</strong><br /><small className="muted">{b.code} · {b.city}</small></div>
              <button className="toggle" style={{ marginLeft: 'auto' }} title="Activer / désactiver"
                      onClick={() => flags.mutate({ id: b.id, is_active: !b.is_active }, { onError })}>
                <span className={`badge ${b.is_active ? 'ok' : 'muted'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
              </button>
            </div>
            <p className="kv">
              {b.address}<br />
              {b.phone && <>Tél. {b.phone}<br /></>}
              {b.email && <>{b.email}<br /></>}
              {b.maps_url && <a href={b.maps_url} target="_blank" rel="noopener noreferrer">Voir sur la carte</a>}
            </p>
            <div className="hours-mini">
              {b.opening_hours.map((h) => (
                <div key={h.day}><span>{DAY_SHORT[h.day]}</span><span className={h.open ? '' : 'muted'}>{h.open ? `${h.from}–${h.to}` : 'Fermé'}</span></div>
              ))}
            </div>
            <small className="muted">{b.staff_count} personne(s) · {b.bookings_count} réservation(s)</small>
            <div className="table-actions" style={{ marginTop: 10 }}>
              <button className="btn ghost sm" onClick={() => setEditing(b)}><Pencil size={14} /> Modifier</button>
              <button className="btn ghost sm" onClick={() => del(b)} aria-label="Supprimer"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {editing !== undefined && (
        <Modal title={editing ? `Modifier ${editing.name}` : 'Nouvelle agence'} size="lg" onClose={() => setEditing(undefined)}>
          <BranchForm key={editing?.id ?? 'new'} row={editing} onDone={() => setEditing(undefined)} onCancel={() => setEditing(undefined)} />
        </Modal>
      )}
    </>
  );
}