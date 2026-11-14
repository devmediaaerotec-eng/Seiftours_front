import { Suspense } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import logo from '@/assets/logo.png';
import { clearPortalToken, getPortalToken } from '@/lib/portalHttp';

export default function PortalLayout() {
  const nav = useNavigate();
  if (!getPortalToken()) return <Navigate to="/portal/login" replace />;

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
        <img src={logo} alt="Seif Tours" className="h-9 w-auto" />
        <button
          type="button"
          className="btn ghost sm ml-auto"
          onClick={() => { clearPortalToken(); nav('/portal/login', { replace: true }); }}
        >
          <LogOut size={14} /> Quitter
        </button>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <Suspense fallback={<div className="center">Chargement…</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}