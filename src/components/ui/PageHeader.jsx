export default function PageHeader({ title, action }) {
  return (
    <div className="title-row">
      <h2>{title}</h2>
      <div style={{ marginLeft: 'auto' }}>{action}</div>
    </div>
  );
}