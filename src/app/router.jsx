import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import ProtectedRoute from '@/features/auth/ProtectedRoute';
import RequirePermission from '@/features/auth/RequirePermission';
import LoginPage from '@/features/auth/LoginPage';

const Trips = lazy(() => import("@/features/Trips/pages/TripsPage"));

const TripEditPage = lazy(() =>
  import("@/features/Trips/pages/TripEditPage")
);

 const Dashboard     = lazy(() => import('@/features/dashboard/DashboardPage'));
const Bookings      = lazy(() => import('@/features/bookings/pages/Bookings'));
const BookingDetail = lazy(() => import('@/features/bookings/pages/BookingDetail'));
 const LiveMap       = lazy(() => import('@/features/fleet/tracking/LiveMapPage'));
const Destinations   = lazy(() => import('@/features/destinations/pages/DestinationsPage'));
const Regions        = lazy(() => import('@/features/destinations/pages/RegionsPage'));
const Deals          = lazy(() => import('@/features/deals/pages/DealsPage'));
const DealEdit       = lazy(() => import('@/features/deals/pages/DealEditPage'));
const DealCategories = lazy(() => import('@/features/deals/pages/DealCategoriesPage'));
const Buses   = lazy(() => import('@/features/fleet/buses/BusesPage'));
const Drivers = lazy(() => import('@/features/fleet/drivers/DriversPage'));
const MissionsWeek    = lazy(() => import('@/features/fleet/missions/MissionsWeekPage'));
const MissionsControl = lazy(() => import('@/features/fleet/missions/MissionsControlPage'));
const MissionsList    = lazy(() => import('@/features/fleet/missions/MissionsListPage'));
const guard = (perm, element) => <RequirePermission perm={perm}>{element}</RequirePermission>;
const Alerts   = lazy(() => import('@/features/fleet/alerts/AlertsPage'));
const Staff    = lazy(() => import('@/features/staff/StaffPage'));
const Settings = lazy(() => import('@/features/settings/SettingsPage'));
const TransportRequests = lazy(() => import('@/features/fleet/transport/TransportRequestsPage'));

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'bookings',      element: guard('bookings.read', <Bookings />) },
      { path: 'bookings/:reference', element: guard('bookings.read', <BookingDetail />) },
     { path: 'trips',          element: guard('trips.manage', <Trips scope="packages" />) },
{ path: 'trips/new',      element: guard('trips.manage', <TripEditPage scope="packages" />) },
{ path: 'trips/:id',      element: guard('trips.manage', <TripEditPage scope="packages" />) },
{ path: 'circuits',       element: guard('trips.manage', <Trips scope="circuits" />) },
{ path: 'circuits/new',   element: guard('trips.manage', <TripEditPage scope="circuits" />) },
{ path: 'circuits/:id',   element: guard('trips.manage', <TripEditPage scope="circuits" />) },
      { path: 'fleet/live',    element: guard('fleet.track', <LiveMap />) },
      { path: '*',             element: <div className="center">Page introuvable.</div> },
    { path: 'destinations',     element: guard('destinations.manage', <Destinations />) },
{ path: 'regions',          element: guard('destinations.manage', <Regions />) },
{ path: 'deals',            element: guard('deals.manage', <Deals />) },
{ path: 'deals/new',        element: guard('deals.manage', <DealEdit />) },
{ path: 'deals/categories', element: guard('deals.manage', <DealCategories />) },
{ path: 'deals/:id',        element: guard('deals.manage', <DealEdit />) },

{ path: 'fleet/buses',   element: guard('fleet.read', <Buses />) },
{ path: 'fleet/drivers', element: guard('fleet.read', <Drivers />) },
    
{ path: 'fleet/missions',         element: guard('fleet.read', <MissionsWeek />) },
{ path: 'fleet/missions/control', element: guard('fleet.read', <MissionsControl />) },
{ path: 'fleet/missions/list',    element: guard('fleet.read', <MissionsList />) },
{ path: 'fleet/alerts', element: guard('alerts.read', <Alerts />) },
{ path: 'staff',        element: guard('staff.manage', <Staff />) },
{ path: 'settings',     element: guard('settings.manage', <Settings />) },
 { path: 'fleet/transport', element: guard('fleet.read', <TransportRequests />) },
],
  },
]);