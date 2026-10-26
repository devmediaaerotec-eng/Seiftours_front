import { useAuth } from './AuthProvider';

export default function RequirePermission({ perm, children }) {
  const { can } = useAuth();
  if (perm && !can(perm)) {
    return <div className="alert bad">Vous n'avez pas accès à cette page.</div>;
  }
  return children;
}