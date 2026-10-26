import { Route, Routes } from 'react-router-dom';
import Layout from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './features/auth/LoginPage';
import Dashboard from './features/dashboard/DashboardPage';
import Bookings from './features/bookings/pages/Bookings';
import BookingDetail from './features/bookings/pages/BookingDetail';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:reference" element={<BookingDetail />} />
      </Route>
      <Route path="*" element={<div className="center">Page introuvable.</div>} />
    </Routes>
  );
}