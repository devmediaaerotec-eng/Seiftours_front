import { Link } from 'react-router-dom';
import { AlertTriangle, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { hmOf } from '@/lib/format';
import { sendToGroup } from '../shared/liveState';
import { lateGroupMessage } from '../shared/messages';
import { useLate } from './resource';

export default function LateAlert() {
  const { can } = useAuth();
  const toast = useToast();
  const { data } = useLate();

  if (!data?.count) return null;
  const shown = data.items.slice(0, 4);

  const sendLate = async () => {
    const copied = await sendToGroup(lateGroupMessage(data.items));
    toast.success(copied ? 'Message copié : choisissez le groupe dans WhatsApp.' : 'WhatsApp ouvert : collez le message.');
  };

  return (
    <div className="alert bad late-alert">
      <div className="late-alert-title">
        <AlertTriangle size={16} /> {data.count} mission(s) en retard
        {can('missions.manage') && (
          <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={sendLate}>
            <MessageCircle size={14} /> Envoyer au groupe
          </button>
        )}
      </div>
      <ul>
        {shown.map((m) => (
          <li key={m.id}>
            <Link to={`/fleet/missions/control?date=${m.starts_at.slice(0, 10)}&filter=late`}>
              {hmOf(m.starts_at)} · {m.title}
            </Link>
            {' '}— {m.driver_name}
            {m.driver_phone && <> · <a href={`tel:${m.driver_phone}`}>{m.driver_phone}</a></>}
          </li>
        ))}
        {data.count > shown.length && <li className="muted">… et {data.count - shown.length} autre(s)</li>}
      </ul>
    </div>
  );
}