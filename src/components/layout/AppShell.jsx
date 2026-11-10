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

// ---------------------------------------------------------------
// SidebarContent — reçoit `collapsed` (desktop) et `onClose` (mobile)
// ---------------------------------------------------------------
function SidebarContent({
  sections, badges, onNavigate, onClose, closeBtnRef,
  collapsed = false,
}) {
  return (
    <div className="flex h-full flex-col">
    
    <div className="relative flex h-16 shrink-0 items-center justify-center border-b border-slate-100 px-3">
  <Link
    to="/"
    onClick={onNavigate}
    aria-label="Seif Tours, accueil"
    className={cn('flex items-center', collapsed && 'hidden')}
  >
    <img src={logo} alt="" className="h-10 w-auto" />
  </Link>

  {onClose && (
    <button
      ref={closeBtnRef}
      type="button"
      onClick={onClose}
      aria-label={collapsed ? 'Ouvrir le menu' : 'Fermer le menu'}
      className={cn(
        'absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-slate-400 outline-none transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-500/50',
        collapsed ? 'left-1/2 -translate-x-1/2' : 'right-3'
      )}
    >
      <X className="size-5" />
    </button>
  )}
</div>

      <nav
        className="scroll-thin flex-1 space-y-6 overflow-y-auto px-3 py-5"
        aria-label="Navigation principale"
      >
        {sections.map((s, i) => (
          <div key={i}>
            {s.section && !collapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {s.section}
              </p>
            )}
            <ul className="space-y-0.5">
              {s.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) => cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors',
                      'focus-visible:ring-2 focus-visible:ring-brand-500/50',
                      collapsed && 'justify-center px-2',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          aria-hidden
                          className={cn(
                            'absolute inset-y-2 left-0 w-1 origin-center rounded-r bg-gold-500 transition-transform duration-200',
                            isActive ? 'scale-y-100' : 'scale-y-0'
                          )}
                        />
                        <Icon
                          className={cn(
                            'size-[18px] shrink-0 transition-colors',
                            isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                          )}
                        />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{label}</span>
                            {badges[to] > 0 && (
                              <span className="min-w-[20px] rounded-full bg-orange-500 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white">
                                {badges[to] > 99 ? '99+' : badges[to]}
                              </span>
                            )}
                          </>
                        )}
                        {collapsed && badges[to] > 0 && (
                          <span className="absolute right-1 top-1 size-2 rounded-full bg-orange-500" />
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

// ---------------------------------------------------------------
// UserMenu — inchangé
// ---------------------------------------------------------------
function UserMenu({ user, onPassword, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item =
    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 outline-none hover:bg-slate-50 focus-visible:bg-slate-100';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500/50"
      >
        <Avatar name={user.fullName} size={32} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[160px] truncate text-sm font-medium text-slate-900">{user.fullName}</span>
          <span className="block max-w-[160px] truncate text-xs text-slate-500">
            {ROLE_LABELS[user.role] ?? user.role}{user.branch ? ` · ${user.branch}` : ''}
          </span>
        </span>
        <ChevronDown className={cn('size-4 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 animate-pop overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-900/10"
        >
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-slate-900">{user.fullName}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            role="menuitem"
            type="button"
            className={item}
            onClick={() => { setOpen(false); onPassword(); }}
          >
            <KeyRound className="size-4 text-slate-400" /> Changer mon mot de passe
          </button>
          <button
            role="menuitem"
            type="button"
            className={cn(item, 'text-red-600 hover:bg-red-50 focus-visible:bg-red-50')}
            onClick={onLogout}
          >
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------
export default function AppShell() {
  const { user, logout, can } = useAuth();
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canSeeAlerts = can('alerts.read');
  const { data: alerts } = useOpenAlertsCount(canSeeAlerts);

  const menuBtnRef = useRef(null);
  const closeBtnRef = useRef(null);
  const drawerRef = useRef(null);

  // Ferme le drawer à chaque changement de route
  useEffect(() => setDrawer(false), [pathname]);

  // Effets du drawer mobile
  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setDrawer(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    closeBtnRef.current?.focus();
    const onTab = (e) => {
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onTab);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keydown', onTab);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [drawer]);

  useEffect(() => { if (!drawer) menuBtnRef.current?.focus?.(); }, [drawer]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => { if (e.matches) setDrawer(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const sections = useMemo(
    () =>
      NAV
        .map((s) => ({ ...s, items: s.items.filter((i) => !i.perm || can(i.perm)) }))
        .filter((s) => s.items.length > 0),
    [can]
  );
  const badges = { '/fleet/alerts': alerts?.open ?? 0 };

  const current = useMemo(() => {
    let best = null;
    for (const s of NAV) {
      for (const it of s.items) {
        const hit = it.end
          ? pathname === it.to
          : pathname === it.to || pathname.startsWith(`${it.to}/`);
        if (hit && (!best || it.to.length > best.item.to.length)) best = { section: s.section, item: it };
      }
    }
    return best;
  }, [pathname]);

  return (
    <div className={cn('min-h-screen transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64')}>
      {/* ---------- Sidebar desktop ---------- */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white transition-[width] duration-200 lg:block',
          sidebarCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <SidebarContent
          sections={sections}
          badges={badges}
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarCollapsed((v) => !v)}
          closeBtnRef={undefined}
        />
      </aside>

      {/* ---------- Drawer mobile ---------- */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-[2px]"
            onClick={() => setDrawer(false)}
            aria-hidden="true"
          />
          <aside
            ref={drawerRef}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-slide-in flex-col bg-white shadow-xl"
          >
            <SidebarContent
              sections={sections}
              badges={badges}
              onNavigate={() => setDrawer(false)}
              onClose={() => setDrawer(false)}
              closeBtnRef={closeBtnRef}
            />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-col">
     
     <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 lg:px-8">
  {/* Hamburger UNIQUEMENT pour mobile */}
  <button
    ref={menuBtnRef}
    type="button"
    onClick={() => setDrawer(true)}
    aria-label="Ouvrir le menu"
    aria-expanded={drawer}
    className="rounded-lg p-2 text-slate-600 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500/50 lg:hidden"
  >
    <Menu className="size-5" />
  </button>

  {/* Fil d'Ariane */}
  <div className="min-w-0 flex-1 truncate text-sm">
    {current?.section && <span className="text-slate-400">{current.section} / </span>}
    <span className="font-medium text-slate-800">{current?.item.label}</span>
  </div>

  {/* Alertes + Menu utilisateur */}
  {canSeeAlerts && (
    <Link
      to="/fleet/alerts"
      aria-label={`Alertes : ${alerts?.open ?? 0} à traiter`}
      className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
    >
      <BellRing className="size-5" />
      {alerts?.open > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-4.5 rounded-full bg-orange-500 px-1 text-center text-[10px] font-semibold leading-[18px] text-white">
          {alerts.open}
        </span>
      )}
    </Link>
  )}

  <UserMenu
    user={user}
    onPassword={() => setShowPassword(true)}
    onLogout={logout}
  />
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