
import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import logo from '@/assets/logo.png';
import { NAV } from '@/config/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOpenAlertsCount } from '@/features/fleet';
import PasswordModal from '@/features/auth/PasswordModal';

export default function AppShell() {
  const { user, logout, can } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const canSeeAlerts = can('alerts.read');
  const { data: alerts } = useOpenAlertsCount(canSeeAlerts);

  const sections = NAV
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.perm || can(i.perm)),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="logo">
          <img src={logo} alt="Seif Tours" />
        </Link>

        <nav className="nav">
          {sections.map((s, i) => (
            <div key={i}>
              {s.section && (
                <div className="nav-section">{s.section}</div>
              )}

              {s.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}>
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          {canSeeAlerts && (
            <Link
              to="/fleet/alerts"
              className="bell"
              aria-label="Alertes de la flotte"
            >
              <BellRing size={20} />
              {alerts?.open > 0 && (
                <span className="count">{alerts.open}</span>
              )}
            </Link>
          )}

          <button
            type="button"
            className="who who-btn"
            onClick={() => setShowPassword(true)}
            title="Changer mon mot de passe"
          >
            <strong>{user.fullName}</strong>
            <small>
              {user.role}
              {user.branch ? ` · ${user.branch}` : ''}
            </small>
          </button>

          <button className="btn ghost" onClick={logout}>
            Déconnexion
          </button>
        </header>

        <main className="content">
          <Suspense
            fallback={<div className="center">Chargement…</div>}
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      {showPassword && (
        <PasswordModal
          onClose={() => setShowPassword(false)}
        />
      )}
    </div>
  );
}
