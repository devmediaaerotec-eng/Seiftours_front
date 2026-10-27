
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BellRing, ChevronDown, KeyRound, LogOut, Menu, X } from 'lucide-react';
import logo from '@/assets/logo.png';
import Avatar from '@/components/ui/Avatar';
import { PageLoader } from '@/components/ui/Spinner';
import { NAV } from '@/config/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import PasswordModal from '@/features/auth/PasswordModal';
import { useOpenAlertsCount } from '@/features/fleet';
import { cn } from '@/lib/cn';

const ROLE_LABELS = {
  super_admin: 'Super administrateur', manager: 'Responsable', agent: "Agent d'agence", accountant: 'Comptable',
  fleet_manager: 'Responsable flotte', dispatcher: 'Dispatcher', secretary: 'Secrétaire',
};

function SidebarContent({ sections, badges, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <Link to="/" onClick={onNavigate} className="flex items-center justify-center border-b border-slate-100 px-5 py-4">
        <img src={logo} alt="Seif Tours" className="h-14 w-auto" />
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
        {sections.map((s, i) => (
          <div key={i}>
            {s.section && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.section}</p>}
            <ul className="space-y-0.5">
              {s.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) => cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-gold-500" />}
                        <Icon className={cn('size-[18px] shrink-0', isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600')} />
                        <span className="flex-1">{label}</span>
                        {badges[to] > 0 && (
                          <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">{badges[to]}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

function UserMenu({ user, onPassword, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const item = 'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50';
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
              className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition hover:bg-slate-100">
        <Avatar name={user.fullName} size={32} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium text-slate-900">{user.fullName}</span>
          <span className="block text-xs text-slate-500">{ROLE_LABELS[user.role] ?? user.role}{user.branch ? ` · ${user.branch}` : ''}</span>
        </span>
        <ChevronDown className="size-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-60 animate-pop overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-900/10">
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-slate-900">{user.fullName}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <button type="button" className={item} onClick={() => { setOpen(false); onPassword(); }}>
            <KeyRound className="size-4 text-slate-400" /> Changer mon mot de passe
          </button>
          <button type="button" className={cn(item, 'text-red-600 hover:bg-red-50')} onClick={onLogout}>
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const { user, logout, can } = useAuth();
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const canSeeAlerts = can('alerts.read');
  const { data: alerts } = useOpenAlertsCount(canSeeAlerts);

  useEffect(() => setDrawer(false), [pathname]);

  const sections = useMemo(
    () => NAV
      .map((s) => ({ ...s, items: s.items.filter((i) => !i.perm || can(i.perm)) }))
      .filter((s) => s.items.length > 0),
    [can]
  );
  const badges = { '/fleet/alerts': alerts?.open ?? 0 };

  // Fil d'Ariane : section et page courantes
  const current = useMemo(() => {
    let best = null;
    for (const s of NAV) {
      for (const it of s.items) {
        const hit = it.end ? pathname === it.to : pathname === it.to || pathname.startsWith(`${it.to}/`);
        if (hit && (!best || it.to.length > best.item.to.length)) best = { section: s.section, item: it };
      }
    }
    return best;
  }, [pathname]);

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <SidebarContent sections={sections} badges={badges} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-slide-in bg-white shadow-xl">
            <button type="button" onClick={() => setDrawer(false)} aria-label="Fermer le menu"
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="size-5" />
            </button>
            <SidebarContent sections={sections} badges={badges} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Ouvrir le menu"
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1 truncate text-sm">
            {current?.section && <span className="text-slate-400">{current.section} / </span>}
            <span className="font-medium text-slate-800">{current?.item.label}</span>
          </div>
          {canSeeAlerts && (
            <Link to="/fleet/alerts" aria-label={`Alertes : ${alerts?.open ?? 0} à traiter`}
                  className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
              <BellRing className="size-5" />
              {alerts?.open > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-4.5 rounded-full bg-orange-500 px-1 text-center text-[10px] font-semibold leading-[18px] text-white">
                  {alerts.open}
                </span>
              )}
            </Link>
          )}
          <UserMenu user={user} onPassword={() => setShowPassword(true)} onLogout={logout} />
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} />}
    </div>
  );
}