
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './features/auth/LoginPage';
import Dashboard from './features/dashboard/DashboardPage';
import Bookings from './features/bookings/pages/Bookings';
import BookingDetail from './features/bookings/pages/BookingDetail';

// Portal imports
import PortalLayout from './features/portal/PortalLayout';

const InvitePage = lazy(() => import('./features/portal/InvitePage'));
const PortalLogin = lazy(() => import('./features/portal/PortalLogin'));
const PortalPage = lazy(() => import('./features/portal/PortalPage'));

export default function App() {
  return (
    <Suspense fallback={<div className="center">Chargement...</div>}>
      <Routes>

        {/* =========================
            ADMINISTRATION
        ========================== */}

        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />

          <Route path="/bookings" element={<Bookings />} />

          <Route
            path="/bookings/:reference"
            element={<BookingDetail />}
          />

          {/* Ajouter ici les autres routes admin existantes */}

        </Route>

        {/* =========================
            ESPACE CLIENT (PORTAL)
            Sans AppShell ni menu admin
        ========================== */}

        <Route path="/invite/:token" element={<InvitePage />} />

        <Route path="/portal/login" element={<PortalLogin />} />

        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<PortalPage />} />
        </Route>

        {/* =========================
            PAGE NOT FOUND
        ========================== */}

        <Route
          path="*"
          element={<div className="center">Page introuvable.</div>}
        />

      </Routes>
    </Suspense>
  );
}
