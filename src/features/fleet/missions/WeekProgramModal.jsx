import { useMemo, useState } from 'react';
import { Copy, MessageCircle, Send } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { fmtDateTime, fmtDayShort } from '@/lib/format';
import { sendToGroup } from '../shared/liveState';
import { useMarkNotified, useWeekProgram } from './resource';

const ORDER = { modified: 0, new: 1, sent: 2 };

function SendBadge({ state, toSend, lastSent }) {
  if (state === 'sent') {
    return <span className="badge ok">✓ Envoyé{lastSent ? ` le ${fmtDateTime(lastSent)}` : ''}</span>;
  }
  if (state === 'modified') return <span className="badge bad">Modifiée : à renvoyer ({toSend})</span>;
  return <span className="badge warn">À envoyer ({toSend})</span>;
}

export default function WeekProgramModal({ start, onClose }) {
  const toast = useToast();
  const { data, isLoading, error } = useWeekProgram(start);
  const mark = useMarkNotified();
  const [opened, setOpened] = useState(() => new Set()); // chauffeurs dont WhatsApp a été ouvert
  const [groupOpened, setGroupOpened] = useState(false);

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success('Message copié.'); }
    catch { toast.error('Copie impossible : sélectionnez le texte à la main.'); }
  };

  const group = async () => {
    const copied = await sendToGroup(data.group_message);
    toast.success(copied ? 'Message copié : choisissez le groupe dans WhatsApp.' : 'WhatsApp ouvert : collez le message.');
    setGroupOpened(true);
  };

  const markSent = (ids, label) =>
    mark.mutate(ids, {
      onSuccess: () => {
        toast.success(`${label} : marqué comme envoyé.`);
        setGroupOpened(false);
      },
      onError: (e) => toast.error(e.message),
    });

  // À renvoyer d'abord, puis à envoyer, puis envoyés
  const drivers = useMemo(
    () => [...(data?.drivers ?? [])].sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.name.localeCompare(b.name)),
    [data],
  );
  const pendingDrivers = drivers.filter((d) => d.state !== 'sent').length;
  const g = data?.group;
  const groupSent = g?.state === 'sent';

  return (
    <Modal title={`Envoyer le programme — semaine du ${fmtDayShort(start)}`} size="lg" onClose={onClose}>
      {isLoading && <div className="center">Chargement…</div>}
      {error && <div className="alert bad">{error.message}</div>}

      {data && drivers.length === 0 && <p className="muted">Aucune mission planifiée cette semaine.</p>}

      {drivers.length > 0 && (
        <>
          

          {pendingDrivers > 0
            ? <div className="alert warn" style={{ marginBottom: 12 }}>{pendingDrivers} chauffeur(s) à informer ou à renvoyer.</div>
            : <div className="alert ok" style={{ marginBottom: 12 }}>Tous les chauffeurs sont à jour.</div>}

          {/* Groupe WhatsApp */}
          <div className="prog-item">
            <div className="prog-head">
              <div>
                <strong>Groupe WhatsApp (tous les chauffeurs)</strong><br />
                <small className="muted">Un seul message, classé par jour puis par chauffeur.</small>
              </div>
              <SendBadge state={g.state} toSend={g.to_send} lastSent={g.last_sent_at} />
              <div className="row-tools" style={{ marginLeft: 'auto' }}>
                <button className="btn ghost sm" onClick={() => copy(data.group_message)}><Copy size={14} /> Copier</button>
                <button className="btn ghost sm" onClick={group}>
                  <MessageCircle size={14} /> {groupSent ? 'Renvoyer au groupe' : 'Envoyer au groupe'}
                </button>
                <button className={`btn sm ${groupOpened && !groupSent ? '' : 'ghost'}`} disabled={mark.isPending}
                        onClick={() => markSent(data.all_ids, 'Groupe')}>
                  <Send size={14} /> {groupSent ? 'Marquer renvoyé' : 'Tout marquer envoyé'}
                </button>
              </div>
            </div>
            <details><summary className="muted">Aperçu</summary><pre className="prog-msg">{data.group_message}</pre></details>
          </div>

          {/* Un chauffeur par ligne */}
          {drivers.map((d) => {
            const sent = d.state === 'sent';
            const wasOpened = opened.has(d.driver_id);
            return (
              <div className="prog-item" key={d.driver_id}>
                <div className="prog-head">
                  <Avatar src={d.photo} name={d.name} size={36} />
                  <div>
                    <strong>{d.name}</strong><br />
                    <small className="muted">{d.count} mission(s) · {d.phone || 'pas de téléphone'}</small>
                  </div>
                  <SendBadge state={d.state} toSend={d.to_send} lastSent={d.last_sent_at} />
                  <div className="row-tools" style={{ marginLeft: 'auto' }}>
                    <button className="btn ghost sm" onClick={() => copy(d.message)}><Copy size={14} /> Copier</button>
                    {d.whatsapp
                      ? <a className="btn ghost sm" href={d.whatsapp} target="_blank" rel="noopener noreferrer"
                           onClick={() => setOpened((s) => new Set(s).add(d.driver_id))}>
                          <MessageCircle size={14} /> {sent ? 'Renvoyer' : 'WhatsApp'}
                        </a>
                      : <button className="btn ghost sm" disabled title="Pas de téléphone">WhatsApp</button>}
                    <button className={`btn sm ${wasOpened && !sent ? '' : 'ghost'}`}
                            disabled={mark.isPending}
                            onClick={() => markSent(d.mission_ids, d.name)}>
                      <Send size={14} /> {sent ? 'Marquer renvoyé' : 'Marquer envoyé'}
                    </button>
                  </div>
                </div>
                <details><summary className="muted">Aperçu du message</summary><pre className="prog-msg">{d.message}</pre></details>
              </div>
            );
          })}
        </>
      )}
    </Modal>
  );
}