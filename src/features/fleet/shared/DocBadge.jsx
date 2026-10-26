import { fmtDate } from '@/lib/format';

export default function DocBadge({ label, date, doc }) {
  if (!date || !doc) return <div className="doc"><span className="muted">{label} : —</span></div>;
  const cls = doc.state === 'expired' ? 'bad' : doc.state === 'soon' ? 'warn' : 'ok';
  const hint = doc.state === 'expired'
    ? `Expirée depuis ${-doc.days} jour(s)`
    : doc.days === 0 ? "Expire aujourd'hui" : `Expire dans ${doc.days} jour(s)`;
  return (
    <div className="doc">
      <span className="muted">{label}</span> <span className={`badge ${cls}`} title={hint}>{fmtDate(date)}</span>
    </div>
  );
}