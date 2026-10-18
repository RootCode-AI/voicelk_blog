import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { BrandLoader } from '../components/Brand.jsx';
import { api } from '../lib/api.js';

const EvaluateAuthContext = createContext(null);

// The console accepts two kinds of session: evaluators, who sign in here, and blog
// administrators, who are recognised by their existing /admin session.
export function EvaluateAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .get('/evaluate/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { user } = await api.post('/evaluate/auth/login', { email, password });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await api.post(user?.role === 'admin' ? '/auth/logout' : '/evaluate/auth/logout').catch(() => {});
    setUser(null);
  }, [user]);

  const value = useMemo(() => ({ user, checking, login, logout }), [user, checking, login, logout]);
  return <EvaluateAuthContext.Provider value={value}>{children}</EvaluateAuthContext.Provider>;
}

export const useEvaluateAuth = () => useContext(EvaluateAuthContext);

export function RequireEvaluator({ children }) {
  const { user, checking } = useEvaluateAuth();
  const location = useLocation();

  if (checking) {
    return (
      <BrandLoader label="Checking your session" className="min-h-[100dvh]" />
    );
  }
  if (!user) return <Navigate to="/evaluate/login" replace state={{ from: location.pathname }} />;
  return children;
}
