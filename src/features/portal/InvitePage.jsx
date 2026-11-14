import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { portalApi } from '@/lib/portalHttp';

export default function InvitePage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    portalApi(`/public/client-invite/${token}`, { auth: false }).then(setInfo).catch((e) => setError(e.message));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw.length < 10) return setError('Mot de passe : 10 caractères minimum.');
    if (pw !== pw2) return setError('Les deux mots de passe sont différents.');
    setBusy(true);
    try {
      await portalApi(`/public/client-invite/${token}`, { method: 'POST', body: { password: pw }, auth: false });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-50 p-4">
      <div className="card w-full max-w-md p-6">
        <h2>Espace client Seif Tours</h2>
        {done ? (
          <>
            <div className="alert ok" style={{ margin: '12px 0' }}>Votre compte est créé.</div>
            <Link className="btn" to="/portal/login">Se connecter</Link>
          </>
        ) : !info ? (
          error ? <div className="alert bad" style={{ marginTop: 12 }}>{error}</div> : <div className="center">Vérification…</div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="muted">Bienvenue <strong>{info.client_name}</strong>. Choisissez un mot de passe pour <strong>{info.email}</strong>.</p>
            <label className="field"><span>Mot de passe (10 caractères minimum)</span>
              <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </label>
            <label className="field" style={{ marginTop: 10 }}><span>Confirmer</span>
              <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </label>
            {error && <div className="alert bad" style={{ marginTop: 12 }}>{error}</div>}
            <div className="modal-actions"><button className="btn" disabled={busy}>{busy ? 'Création…' : 'Créer mon compte'}</button></div>
          </form>
        )}
      </div>
    </div>
  );
}