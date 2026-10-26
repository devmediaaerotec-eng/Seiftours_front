export default function Pagination({ page, total, limit, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pager">
      <button className="btn ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Précédent</button>
      <span>Page {page} / {pages} · {total} résultat(s)</span>
      <button className="btn ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>Suivant →</button>
    </div>
  );
}