import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/lib/http';
import { STATUS, fmtDate, fmtDateTime, money } from '@/lib/format';

// Doit refléter les transitions autorisées côté serveur
const ACTIONS = {
  pending_agency: [
    { to: 'confirmed', label: 'Confirmer', cls: 'btn' },
    { to: 'cancelled', label: 'Annuler', cls: 'btn danger' },
    { to: 'expired',   label: 'Marquer expirée', cls: 'btn ghost' },
  ],
  confirmed: [{ to: 'cancelled', label: 'Annuler', cls: 'btn danger' }],
};

const occupancyText = (raw) => {
  try {
    const rooms = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return rooms.map((r, i) => `Ch. ${i + 1} : ${r.adults} adulte(s)${r.children ? `, ${r.children} enfant(s)` : ''}`).join(' · ');
  } catch { return '—'; }
};

export default function BookingDetail() {
  const { reference } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api(`/admin/bookings/${reference}`)
      .then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e.status === 404 ? 'Réservation introuvable.' : e.message));
  }, [reference]);

  useEffect(load, [load]);

  const changeStatus = async (to) => {
    if (to === 'cancelled' && !window.confirm('Annuler cette réservation ?')) return;
    setBusy(true); setMsg(''); setError('');
    try {
      await api(`/admin/bookings/${reference}/status`, {
        method: 'PATCH',
        body: { status: to, note: note.trim() || null },
      });
      setNote('');
      setMsg(`Statut mis à jour : ${STATUS[to].label}`);
      load();
    } catch (e) {
      setError(
        e.status === 403 ? "Vous n'avez pas le droit d'effectuer cette action."
        : e.status === 409 ? 'Changement de statut impossible (état modifié entre-temps ?).'
        : e.message
      );
    } finally { setBusy(false); }
  };

  if (error && !data) return <><Link to="/bookings">← Retour</Link><div className="alert bad">{error}</div></>;
  if (!data) return <div className="center">Chargement…</div>;

  const { booking: b, items, payments, history, notes } = data;
  const actions = ACTIONS[b.status] || [];

  return (
    <>
      <Link to="/bookings">← Retour aux réservations</Link>
      <div className="title-row">
        <h2>{b.reference}</h2>
        <span className={`badge ${STATUS[b.status]?.cls}`}>{STATUS[b.status]?.label || b.status}</span>
      </div>

      {error && <div className="alert bad">{error}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="grid">
        <section className="card">
          <h3>Client</h3>
          <p><strong>{b.customer_name}</strong><br />{b.email}<br />{b.phone}</p>
          <p className="muted">Mode : {b.mode} · Source : {b.source}<br />
            Agence : {b.branch_name || '—'} · Créée le {fmtDateTime(b.created_at)}</p>
        </section>

        <section className="card">
          <h3>Montants</h3>
          <dl>
            <dt>Total</dt><dd>{money(b.total_millimes)}</dd>
            <dt>Acompte prévu</dt><dd>{money(b.deposit_millimes)}</dd>
            <dt>Déjà payé</dt><dd>{money(b.paid_millimes)}</dd>
            <dt>Reste à payer</dt><dd><strong>{money(b.balance_due_millimes)}</strong></dd>
          </dl>
        </section>
      </div>

      <section className="card">
        <h3>Séjour</h3>
        {items.map((it) => (
          <div key={it.id} className="item">
            <strong>{it.hotel_name}</strong> — {it.room_name} ({it.board_name || 'sans pension'})<br />
            {fmtDate(it.check_in)} → {fmtDate(it.check_out)} · {it.nights} nuit(s) · {money(it.price_millimes)}<br />
            <small className="muted">{occupancyText(it.occupancy)}</small>
            {it.guests?.length > 0 && (
              <ul>
                {it.guests.map((g, i) => (
                  <li key={i}>Ch. {Number(g.room_index) + 1} : {g.title || ''} {g.first_name} {g.last_name}{g.is_child ? ` (enfant, ${g.age} ans)` : ''}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {actions.length > 0 && (
        <section className="card">
          <h3>Actions</h3>
          <textarea rows="2" placeholder="Note interne (optionnelle)" value={note}
                    onChange={(e) => setNote(e.target.value)} />
          <div className="actions">
            {actions.map((a) => (
              <button key={a.to} className={a.cls} disabled={busy} onClick={() => changeStatus(a.to)}>{a.label}</button>
            ))}
          </div>
        </section>
      )}

      <div className="grid">
        <section className="card">
          <h3>Paiements</h3>
          {payments.length === 0 ? <p className="muted">Aucun paiement.</p> : (
            <table>
              <thead><tr><th>Type</th><th>Moyen</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.kind}</td><td>{p.provider}</td><td>{money(p.amount_millimes)}</td>
                    <td>{p.status}</td><td>{fmtDateTime(p.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h3>Historique</h3>
          <ul className="timeline">
            {history.map((h, i) => (
              <li key={i}>
                {fmtDateTime(h.created_at)} — {h.from_status ? `${STATUS[h.from_status]?.label} → ` : ''}
                <strong>{STATUS[h.to_status]?.label || h.to_status}</strong>
                <small className="muted"> ({h.changed_by || 'système'})</small>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <h3>Notes internes</h3>
        {notes.length === 0 ? <p className="muted">Aucune note.</p> : (
          <ul className="timeline">
            {notes.map((n, i) => (
              <li key={i}>{n.body}<br /><small className="muted">{n.author} · {fmtDateTime(n.created_at)}</small></li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}