import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Bus, CalendarCheck, Eye, EyeOff, Lock, Mail, Plane } from 'lucide-react';
import logo from '@/assets/logo.png';
import Button from '@/components/ui/Button';
import { useAuth } from './AuthProvider';

const FEATURES = [
  { icon: CalendarCheck, text: 'Réservations et devis centralisés' },
  { icon: Plane, text: 'Voyages, circuits et bons plans' },
  { icon: Bus, text: 'Flotte, missions et suivi en direct' },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'E-mail ou mot de passe incorrect.' : 'Connexion impossible. Vérifiez votre réseau et réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-brand-950 via-brand-800 to-brand-600 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-brand-300/10 blur-3xl" />
        <div className="relative inline-flex w-fit rounded-2xl bg-white p-4 shadow-xl">
          <img src={logo} alt="Seif Tours" className="h-20 w-auto" />
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Pilotez votre agence en un seul endroit.</h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-brand-50">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20"><Icon className="size-[18px]" /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-200">© {new Date().getFullYear()} Seif Tours · Accès réservé au personnel</p>
      </aside>

      <main className="flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <img src={logo} alt="Seif Tours" className="mx-auto mb-8 h-16 w-auto lg:hidden" />
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Connexion</h2>
          <p className="mt-1 text-sm text-slate-500">Accédez à l'espace d'administration.</p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Adresse e-mail</span>
              <span className="relative mt-1.5 block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input type="email" required autoFocus autoComplete="username" className="pl-10" placeholder="nom@seiftours.tn"
                       value={email} onChange={(e) => setEmail(e.target.value)} />
              </span>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">Mot de passe</span>
              <span className="relative mt-1.5 block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input type={show ? 'text' : 'password'} required autoComplete="current-password" className="px-10"
                       value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-600/20">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}