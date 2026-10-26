export default function Field({ label, error, hint, className = '', children }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
      {error && <small className="field-error">{error.message}</small>}
    </label>
  );
}