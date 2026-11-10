import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Inbox, Mail, MessageCircle, Phone, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { removeMessage, updateMessage, useCounts, useMessages } from './messagesApi';
import './contact.css';

const SUBJECTS = {
  general: 'Question générale', hotels: 'Hôtels en Tunisie', omra: 'Omra', trips: 'Voyage organisé',
  flights: 'Vols', circuits: 'Circuits', transport: 'Location de bus',
};
const STATUS = { new: 'Nouveau', read: 'Lu', answered: 'Répondu', archived: 'Archivé' };

/** « il y a 5 min », « hier », « 12/10/2026 » */
const ago = (iso) => {
  const d = new Date(String(iso).replace(' ', 'T'));
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  if (m < 1440) return `il y a ${Math.floor(m / 60)} h`;
  if (m < 2880) return 'hier';
  return d.toLocaleDateString('fr-FR');
};
const full = (iso) => new Date(String(iso).replace(' ', 'T')).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
/** Numéro tunisien à 8 chiffres : on ajoute 216 pour le lien WhatsApp */
const waNumber = (phone) => { const d = String(phone).replace(/\D/g, ''); return d.length === 8 ? `216${d}` : d.replace(/^00/, ''); };

function Detail({ msg, onClose, onChanged }) {
  const [notes, setNotes] = useState(msg.admin_notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setNotes(msg.admin_notes ?? ''); setError(''); }, [msg.id]);

  const run = async (fn) => { setBusy(true); setError(''); try { await fn(); onChanged?.(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const setStatus = (status) => run(() => updateMessage(msg.id, { status }));
  const saveNotes = () => run(() => updateMessage(msg.id, { admin_notes: notes }));
  const del = () => { if (window.confirm(`Supprimer définitivement le message de ${msg.name} ?`)) run(async () => { await removeMessage(msg.id); onClose(); }); };

  return (
    <div className="cm-detail">
      <button className="btn ghost sm cm-back" onClick={onClose}><ArrowLeft size={16} /> Retour</button>
      <div className="cm-head">
        <div>
          <h2>{msg.name}</h2>
          <small>{full(msg.created_at)}</small>
        </div>
        <span className={`cm-chip ${msg.subject}`}>{SUBJECTS[msg.subject]}</span>
      </div>

      <div className="cm-reach">
        {msg.phone && <a href={`tel:${msg.phone}`}><Phone size={16} /> {msg.phone}</a>}
        {msg.phone && <a className="wa" href={`https://wa.me/${waNumber(msg.phone)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> WhatsApp</a>}
        {msg.email && <a href={`mailto:${msg.email}?subject=${encodeURIComponent('Re: ' + SUBJECTS[msg.subject] + ' — Seif Tours')}`}><Mail size={16} /> {msg.email}</a>}
      </div>

      <div className="cm-body">{msg.message}</div>

      {error && <div className="alert bad">{error}</div>}
      <div className="cm-seg" role="group" aria-label="Statut">
        {Object.entries(STATUS).map(([k, v]) => (
          <button key={k} className={msg.status === k ? 'on' : ''} aria-pressed={msg.status === k} disabled={busy} onClick={() => msg.status !== k && setStatus(k)}>{v}</button>
        ))}
      </div>

      <div className="cm-notes">
        <label htmlFor="cm-notes">Notes internes</label>
        <textarea id="cm-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Rappelé le… devis envoyé…" />
        <div className="cm-foot">
          <button className="btn" disabled={busy || notes === (msg.admin_notes ?? '')} onClick={saveNotes}>Enregistrer les notes</button>
          <button className="btn ghost danger" disabled={busy} onClick={del}><Trash2 size={15} style={{ verticalAlign: '-3px' }} /> Supprimer</button>
        </div>
        {msg.handled_by_name && <small style={{ color: 'var(--mute)', display: 'block', marginTop: '.6rem' }}>Dernier traitement : {msg.handled_by_name}, {full(msg.handled_at)}</small>}
      </div>
    </div>
  );
}

export default function ContactMessagesPage() {
  const [status, setStatus] = useState('');             // '' = tous sauf archivés
  const [subject, setSubject] = useState('');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [openId, setOpenId] = useState(null);

  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 350); return () => clearTimeout(t); }, [q]);

  const { data, loading, error } = useMessages({ status, subject, q: dq, limit: 100 });
  const counts = useCounts().data;
  const items = data?.items ?? [];
  const open = useMemo(() => items.find((m) => m.id === openId) ?? null, [items, openId]);

  // Ouvrir un message « Nouveau » le marque comme lu
  const select = (m) => {
    setOpenId(m.id);
    if (m.status === 'new') updateMessage(m.id, { status: 'read' }).catch(() => {});
  };

  const tabs = [['', 'Boîte de réception', (counts?.new ?? 0) + (counts?.read ?? 0) + (counts?.answered ?? 0)], ['new', 'Nouveaux', counts?.new], ['read', 'Lus', counts?.read], ['answered', 'Répondus', counts?.answered], ['archived', 'Archivés', counts?.archived]];

  return (
    <div className="cm">
      <PageHeader title={`Messages de contact${counts?.new ? ` · ${counts.new} nouveau${counts.new > 1 ? 'x' : ''}` : ''}`} />

      <div className="cm-tabs" role="tablist">
        {tabs.map(([k, label, n]) => (
          <button key={k} role="tab" aria-selected={status === k} className={`cm-tab ${status === k ? 'on' : ''} ${k === 'new' ? 'new' : ''}`} onClick={() => { setStatus(k); setOpenId(null); }}>
            {label}{n != null && <b>{n}</b>}
          </button>
        ))}
      </div>
      <div className="cm-tools">
        <input type="search" placeholder="Nom, téléphone, e-mail, message" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Sujet">
          <option value="">Tous les sujets</option>
          {Object.entries(SUBJECTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {error && <div className="alert bad">{error.message}</div>}

      <div className="cm-shell">
        <div className="cm-list" role="list">
          {loading && !data ? <div className="cm-empty">Chargement…</div>
            : items.length === 0 ? (
              <div className="cm-empty"><Inbox size={34} /><h3>Aucun message</h3><p>Les messages envoyés depuis la page Contact du site apparaissent ici.</p></div>
            ) : items.map((m) => (
              <button key={m.id} role="listitem" className={`cm-item ${m.status === 'new' ? 'unread' : ''} ${m.id === openId ? 'sel' : ''}`} onClick={() => select(m)}>
                <div className="cm-row1"><strong>{m.name}</strong><time dateTime={m.created_at}>{ago(m.created_at)}</time></div>
                <p className="cm-prev">{m.message}</p>
                <span className={`cm-chip ${m.subject}`}>{SUBJECTS[m.subject]}</span>
                {status === '' && m.status === 'answered' && <span className="cm-chip" style={{ marginLeft: '.35rem', background: '#e3f4e8', color: '#1f6b3a' }}>Répondu</span>}
              </button>
            ))}
        </div>

        {open ? <Detail msg={open} onClose={() => setOpenId(null)} />
          : <div className="cm-detail cm-empty" style={{ position: 'static' }}><Mail size={34} /><h3>Sélectionnez un message</h3><p>Le contenu et les boutons Appeler, WhatsApp et E-mail s'affichent ici.</p></div>}
      </div>
    </div>
  );
}
