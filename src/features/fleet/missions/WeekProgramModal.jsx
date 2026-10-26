import { Copy, MessageCircle, Send } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { fmtDayShort } from '@/lib/format';
import { useMarkNotified, useWeekProgram } from './resource';

export default function WeekProgramModal({ start, onClose }) {
  const toast = useToast();
  const { data, isLoading, error } = useWeekProgram(start);
  const mark = useMarkNotified();

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success('Message copié.'); }
    catch { toast.error('Copie impossible : sélectionnez le texte à la main.'); }
  };

  const markSent = (ids, label) =>
    mark.mutate(ids, {
      onSuccess: () => toast.success(`${label} marqué comme envoyé.`),
      onError: (e) => toast.error(e.message),
    });

  const drivers = data?.drivers ?? [];
  const pendingIds = drivers.filter((d) => d.to_send > 0).flatMap((d) => d.mission_ids);

  return (
    <Modal title={`Envoyer le programme — semaine du ${fmtDayShort(start)}`} size="lg" onClose={onClose}>
      {isLoading && <div className="center">Chargement…</div>}
      {error && <div className="alert bad">{error.message}</div>}

      {data && drivers.length === 0 && <p className="muted">Aucune mission planifiée cette semaine.</p>}

      {drivers.length > 0 && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            Copiez le message ou ouvrez-le dans WhatsApp, puis cliquez sur <strong>Marquer envoyé</strong> : le système
            vous indiquera ensuite toute mission modifiée à <strong>renvoyer</strong>.
          </p>

          <div className="prog-item">
            <div className="prog-head">
              <strong>Message général (tous les chauffeurs)</strong>
              <div className="row-tools" style={{ marginLeft: 'auto' }}>
                <button className="btn ghost sm" onClick={() => copy(data.all_message)}><Copy size={14} /> Copier</button>
                {pendingIds.length > 0 && (
                  <button className="btn sm" disabled={mark.isPending} onClick={() => markSent(pendingIds, 'Programme')}>
                    <Send size={14} /> Tout marquer envoyé
                  </button>
                )}
              </div>
            </div>
            <details><summary className="muted">Aperçu</summary><pre className="prog-msg">{data.all_message}</pre></details>
          </div>

          {drivers.map((d) => (
            <div className="prog-item" key={d.driver_id}>
              <div className="prog-head">
                <Avatar src={d.photo} name={d.name} size={36} />
                <div>
                  <strong>{d.name}</strong><br />
                  <small className="muted">{d.count} mission(s) · {d.phone || 'pas de téléphone'}</small>
                </div>
                <span className={`badge ${d.to_send > 0 ? 'warn' : 'ok'}`}>
                  {d.to_send > 0 ? `À envoyer (${d.to_send})` : 'À jour'}
                </span>
                <div className="row-tools" style={{ marginLeft: 'auto' }}>
                  <button className="btn ghost sm" onClick={() => copy(d.message)}><Copy size={14} /> Copier</button>
                  {d.whatsapp
                    ? <a className="btn ghost sm" href={d.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> WhatsApp</a>
                    : <button className="btn ghost sm" disabled>WhatsApp</button>}
                  <button className="btn sm" disabled={mark.isPending || d.to_send === 0}
                          onClick={() => markSent(d.mission_ids, d.name)}><Send size={14} /> Marquer envoyé</button>
                </div>
              </div>
              <details><summary className="muted">Aperçu du message</summary><pre className="prog-msg">{d.message}</pre></details>
            </div>
          ))}
        </>
      )}
    </Modal>
  );
}