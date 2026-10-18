import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { BrandLoader } from '../components/Brand.jsx';
import { api } from '../lib/api.js';

const WriterAuthContext = createContext(null);

// The writing desk's own session. It is separate from the admin session on purpose:
// a blogger signed in here cannot open /admin.
export function WriterAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .get('/write/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { user } = await api.post('/write/auth/login', { email, password });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/write/auth/logout').catch(() => {});
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, checking, login, logout }), [user, checking, login, logout]);
  return <WriterAuthContext.Provider value={value}>{children}</WriterAuthContext.Provider>;
}

export const useWriterAuth = () => useContext(WriterAuthContext);

export function RequireWriter({ children }) {
  const { user, checking } = useWriterAuth();
  const location = useLocation();
  if (checking) return <BrandLoader label="Checking your session" className="min-h-[100dvh]" />;
  if (!user) return <Navigate to="/write/login" replace state={{ from: location.pathname }} />;
  return children;
}
