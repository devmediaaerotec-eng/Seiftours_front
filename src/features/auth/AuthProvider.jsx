import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, clearToken, getToken, setToken, setUnauthorizedHandler } from '@/lib/http';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    queryClient.clear();            // évite de montrer les données d'un utilisateur au suivant
  }, [queryClient]);

  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api('/admin/me')
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token } = await api('/admin/login', { method: 'POST', body: { email, password } });
    setToken(token);
    setUser(await api('/admin/me'));
  }, []);

  const can = useCallback(
    (perm) => !!user?.permissions?.includes(perm),
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, can }),
    [user, loading, login, logout, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);