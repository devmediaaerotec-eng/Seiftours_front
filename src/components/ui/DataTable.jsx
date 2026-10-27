import EmptyState from './EmptyState';

export default function DataTable({ columns, rows = [], loading, empty = 'Aucun résultat.', onRowClick }) {
  const showSkeleton = loading && rows.length === 0;
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={c.className}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {showSkeleton && Array.from({ length: 5 }, (_, i) => (
            <tr key={`s${i}`}>
              {columns.map((c) => <td key={c.key}><div className="h-4 w-full max-w-40 animate-pulse rounded bg-slate-100" /></td>)}
            </tr>
          ))}
          {rows.map((r, i) => (
            <tr key={r.id ?? i} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'cursor-pointer' : undefined}>
              {columns.map((c) => <td key={c.key} className={c.className}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={columns.length}><EmptyState title={empty} /></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}