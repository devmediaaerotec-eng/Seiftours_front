import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalApi, setPortalToken } from '@/lib/portalHttp';

export default function PortalLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await portalApi('/public/portal/login', { method: 'POST', body: { email, password: pw }, auth: false });
      setPortalToken(token);
      nav('/portal', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-50 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6" noValidate>
        <h2>Espace client</h2>
        <label className="field" style={{ marginTop: 12 }}><span>Email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field" style={{ marginTop: 10 }}><span>Mot de passe</span>
          <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        {error && <div className="alert bad" style={{ marginTop: 12 }}>{error}</div>}
        <div className="modal-actions"><button className="btn" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button></div>
      </form>
    </div>
  );
}