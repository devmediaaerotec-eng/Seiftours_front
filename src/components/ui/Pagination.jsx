import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export default function Pagination({ page, total, limit, onChange }) {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  if (pages === 1) return <p className="mt-3 text-sm text-slate-500">{total} résultat{total > 1 ? 's' : ''}</p>;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
      <p>{from}–{to} sur {total}</p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)}>Précédent</Button>
        <span className="hidden sm:inline">Page {page} / {pages}</span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Suivant <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}