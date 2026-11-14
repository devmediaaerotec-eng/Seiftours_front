import { useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { fmtDayLong } from '@/lib/format';
import { clearPortalToken, getPortalToken, portalApi } from '@/lib/portalHttp';

const STATUS = {
  planned: ['Planifiée', 'info'], in_progress: ['En cours', 'info'], completed: ['Effectuée', 'ok'],
  not_done: ['Non effectuée', 'warn'], cancelled: ['Annulée', 'muted'],
};
const LEG = { aller: 'Aller', retour: 'Retour' };

export default function PortalPage() {
  const nav = useNavigate();
  const authed = !!getPortalToken();
  const me = useQuery({ queryKey: ['portal', 'me'], queryFn: () => portalApi('/portal/me'), enabled: authed, retry: false });
  const list = useQuery({ queryKey: ['portal', 'missions'], queryFn: () => portalApi('/portal/missions'), enabled: authed, retry: false });

  if (!authed || me.error?.status === 401) return <Navigate to="/portal/login" replace />;

  const days = {};
  (list.data?.items ?? []).forEach((s) => { (days[s.starts_at.slice(0, 10)] ??= []).push(s); });

  return (
    <div className="mx-auto max-w-3xl p-4">
     <div className="mb-4">
  <h2>{me.data?.client_name ?? 'Espace client'}</h2>
  <small className="muted">{me.data?.email}</small>
</div>

      {list.isLoading && <div className="center">Chargement…</div>}
      {list.error && list.error.status !== 401 && <div className="alert bad">{list.error.message}</div>}
      {list.data && !Object.keys(days).length && <div className="card"><p className="muted" style={{ padding: 16, margin: 0 }}>Aucune mission à venir.</p></div>}

      {Object.entries(days).map(([day, steps]) => (
        <div className="card" key={day} style={{ marginBottom: 12 }}>
          <div className="drv-head"><strong className="cap">{fmtDayLong(day)}</strong></div>
          <table><tbody>
            {steps.map((s, i) => {
              const [label, cls] = STATUS[s.status] ?? STATUS.planned;
              return (
                <tr key={i}>
                  <td style={{ width: 130 }}><strong>{s.starts_at.slice(11, 16)}</strong> → {s.ends_at.slice(11, 16)}</td>
                  <td>
                    <strong>{[LEG[s.leg], s.title].filter(Boolean).join(' · ')}</strong><br />
                    <small className="muted">
                      {[s.pickup_place, s.destination].filter(Boolean).join(' → ') || '—'} · {s.buses} bus
                    </small>
                  </td>
                  <td><span className={`badge ${cls}`}>{label}</span></td>
                </tr>
              );
            })}
          </tbody></table>
        </div>
      ))}
    </div>
  );
}