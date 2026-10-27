import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, ShieldAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from './AuthProvider';

export default function RequirePermission({ perm, children }) {
  const { user, can } = useAuth();
  const navigate = useNavigate();

  if (!perm || can(perm)) return children;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-2 py-14 text-center sm:py-20">
      <span className="flex size-16 items-center justify-center rounded-full bg-red-50 text-red-500 ring-8 ring-red-50/60">
        <ShieldAlert className="size-8" />
      </span>
      <h1 className="mt-6 text-xl font-semibold text-slate-900">Accès refusé</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        Votre rôle ne permet pas d'ouvrir cette page. Si vous pensez qu'il s'agit d'une erreur,
        demandez à un administrateur de vous accorder le droit nécessaire.
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-slate-600">
        {user && <span className="rounded-full bg-slate-100 px-3 py-1">{user.fullName} · {user.role}</span>}
        <span className="rounded-full bg-slate-100 px-3 py-1">Droit requis : <code className="font-mono">{perm}</code></span>
      </div>

      <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>Retour</Button>
        <Button as={Link} to="/" icon={Home}>Tableau de bord</Button>
      </div>
    </div>
  );
}