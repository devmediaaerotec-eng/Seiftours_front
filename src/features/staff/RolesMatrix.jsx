import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useRoles, useSaveRolePermissions } from './resource';

const GROUPS = {
  bookings: 'Réservations', payments: 'Paiements', customers: 'Clients', hotels: 'Hôtels et marges',
  trips: 'Voyages et circuits', deals: 'Bons plans', destinations: 'Destinations',
  fleet: 'Flotte', missions: 'Missions', alerts: 'Alertes',
  reports: 'Statistiques', audit: "Journal d'audit", staff: 'Personnel', settings: 'Réglages',
};

const same = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

export default function RolesMatrix() {
  const toast = useToast();
  const { data, isLoading, error } = useRoles();
  const save = useSaveRolePermissions();
  const [draft, setDraft] = useState({});

  const roles = data?.roles ?? [];
  const perms = data?.permissions ?? [];
  const current = (r) => draft[r.id] ?? r.permissions;
  const dirty = roles.filter((r) => draft[r.id] && !same(draft[r.id], r.permissions));

  const toggle = (r, code) => {
    const set = new Set(current(r));
    set.has(code) ? set.delete(code) : set.add(code);
    setDraft({ ...draft, [r.id]: [...set] });
  };

  const saveAll = async () => {
    try {
      for (const r of dirty) await save.mutateAsync({ id: r.id, permissions: draft[r.id] });
      setDraft({});
      toast.success('Droits enregistrés. Ils s\'appliquent à la prochaine connexion des personnes concernées.');
    } catch (e) { toast.error(e.message); }
  };

  const grouped = perms.reduce((acc, p) => {
    const g = p.code.split('.')[0];
    (acc[g] ??= []).push(p);
    return acc;
  }, {});

  if (isLoading) return <div className="center">Chargement…</div>;
  if (error) return <div className="alert bad">{error.message}</div>;

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Cochez les droits de chaque rôle. Le super administrateur a toujours tous les droits. Les modifications ne sont enregistrées qu'avec le bouton en bas.
      </p>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="matrix">
          <thead>
            <tr>
              <th>Droit</th>
              {roles.map((r) => (
                <th key={r.id} className="c">{r.label}<br /><small className="muted">{r.staff_count} personne(s)</small></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([g, list]) => (
              <>
                <tr key={`g-${g}`} className="group-row"><td colSpan={roles.length + 1}>{GROUPS[g] ?? g}</td></tr>
                {list.map((p) => (
                  <tr key={p.code}>
                    <td>{p.description}<br /><small className="muted">{p.code}</small></td>
                    {roles.map((r) => {
                      const locked = r.code === 'super_admin';
                      return (
                        <td key={r.id} className="c">
                          {locked
                            ? <Lock size={14} className="muted" aria-label="Verrouillé" />
                            : <input type="checkbox" checked={current(r).includes(p.code)} onChange={() => toggle(r, p.code)} aria-label={`${r.label} : ${p.description}`} />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <div className="form-actions">
        {dirty.length > 0 && <button className="btn ghost" onClick={() => setDraft({})}>Annuler les modifications</button>}
        <button className="btn" disabled={!dirty.length || save.isPending} onClick={saveAll}>
          {save.isPending ? 'Enregistrement…' : `Enregistrer${dirty.length ? ` (${dirty.length} rôle${dirty.length > 1 ? 's' : ''})` : ''}`}
        </button>
      </div>
    </>
  );
}