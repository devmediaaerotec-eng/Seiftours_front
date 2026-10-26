export default function DataTable({ columns, rows = [], loading, empty = 'Aucun résultat.' }) {
  return (
    <table>
      <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id ?? i}>
            {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>)}
          </tr>
        ))}
        {loading && <tr><td colSpan={columns.length} className="muted">Chargement…</td></tr>}
        {!loading && rows.length === 0 && <tr><td colSpan={columns.length} className="muted">{empty}</td></tr>}
      </tbody>
    </table>
  );
}