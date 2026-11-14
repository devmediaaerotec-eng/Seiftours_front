import { useState } from 'react';
import { Copy, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { sendToGroup, waLink } from '../shared/liveState';
import { buildNotice, NOTICE_KINDS } from '../shared/messages';
import MissionBadges from './MissionBadges';
import { useLogNotice, useMission } from './resource';

export default function NoticeForm({ id, kind, onBack }) {
  const detail = useMission(id);
  if (detail.isLoading) return <div className="center">Chargement…</div>;
  if (detail.error) return <div className="alert bad">{detail.error.message}</div>;
  return <NoticeBody m={detail.data.mission} initialKind={kind} onBack={onBack} />;
}

function NoticeBody({ m, initialKind, onBack }) {
  const toast = useToast();
  const log = useLogNotice();

  const startKind = initialKind || (m.is_late ? 'late' : 'reminder');
  const [kind, setKind] = useState(startKind);
  const [to, setTo] = useState('driver');
  const [text, setText] = useState(() => buildNotice(startKind, m, { to: 'driver' }));

  const groupOk = NOTICE_KINDS.find((k) => k.key === kind)?.groupOk;

  const pick = (k, dest = to) => {
    const allowed = NOTICE_KINDS.find((x) => x.key === k)?.groupOk;
    const next = allowed ? dest : 'driver';
    setKind(k);
    setTo(next);
    setText(buildNotice(k, m, { to: next }));
  };

  // Trace l'envoi dans l'historique de la mission
  const record = () => log.mutate({ id: m.id, kind, to }, { onError: (e) => toast.error(e.message) });

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast.success('Message copié.'); }
    catch { toast.error('Copie impossible : sélectionnez le texte à la main.'); }
  };

  const sendDriver = () => {
    window.open(waLink(m.driver_phone, text), '_blank', 'noopener,noreferrer');
    record();
  };

  const sendGroup = async () => {
    const copied = await sendToGroup(text);
    toast.success(copied ? 'Message copié : choisissez le groupe dans WhatsApp.' : 'WhatsApp ouvert : collez le message.');
    record();
  };

  return (
    <div>
      <div className="card" style={{ background: '#f8fafb', padding: 14 }}>
        <div className="title-row">
          <div>
            <strong>{m.title}</strong> <small className="muted">· {m.reference}</small><br />
            <span className="muted">{m.driver_name} · Bus {m.bus_plate}</span>
          </div>
          <div style={{ marginLeft: 'auto' }}><MissionBadges m={m} /></div>
        </div>
      </div>

      <h4 className="form-section">Type de message</h4>
      <div className="seg">
        {NOTICE_KINDS.map((k) => (
          <button key={k.key} type="button" className={kind === k.key ? 'on' : ''} onClick={() => pick(k.key)}>{k.label}</button>
        ))}
      </div>

      <h4 className="form-section">Destinataire</h4>
      <div className="seg">
        <button type="button" className={to === 'driver' ? 'on' : ''} onClick={() => pick(kind, 'driver')}>Le chauffeur</button>
        <button type="button" className={to === 'group' ? 'on' : ''} disabled={!groupOk} onClick={() => pick(kind, 'group')}
                title={groupOk ? '' : 'Un avertissement ne part jamais dans le groupe'}>Le groupe</button>
      </div>
      {!groupOk && <small className="muted" style={{ display: 'block', marginTop: 6 }}>Un avertissement est personnel : il ne peut être envoyé qu'au chauffeur.</small>}

      <h4 className="form-section">Message (modifiable)</h4>
      <textarea rows="12" value={text} onChange={(e) => setText(e.target.value)} />
      {text.includes('[à compléter]') && <small className="field-error">Complétez le motif avant d'envoyer.</small>}

      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onBack}>Retour</button>
        <button type="button" className="btn ghost" onClick={copy}><Copy size={16} /> Copier</button>
        {to === 'driver'
          ? <button type="button" className="btn" disabled={!m.driver_phone || !text.trim()} onClick={sendDriver}
                    title={m.driver_phone ? '' : 'Pas de téléphone'}><MessageCircle size={16} /> WhatsApp chauffeur</button>
          : <button type="button" className="btn" disabled={!text.trim()} onClick={sendGroup}><MessageCircle size={16} /> Envoyer au groupe</button>}
      </div>
    </div>
  );
}