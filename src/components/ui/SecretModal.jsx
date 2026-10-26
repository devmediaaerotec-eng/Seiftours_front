import { Copy } from 'lucide-react';
import Modal from './Modal';
import { useToast } from './Toast';

export default function SecretModal({ title, intro, rows = [], secret, onClose }) {
  const toast = useToast();
  const copy = async () => {
    try { await navigator.clipboard.writeText(secret); toast.success('Copié.'); }
    catch { toast.error('Copie impossible : recopiez à la main.'); }
  };
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{intro}</p>
      {rows.map(([k, v]) => <div key={k} className="kv"><span className="muted">{k} :</span> <strong>{v}</strong></div>)}
      <div className="pin-box" style={{ fontSize: 24, letterSpacing: 2 }}>{secret}</div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={copy}><Copy size={16} /> Copier</button>
        <button className="btn" onClick={onClose}>Fermer</button>
      </div>
    </Modal>
  );
}