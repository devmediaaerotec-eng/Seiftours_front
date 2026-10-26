import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center">Chargement…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}