import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'bs_token';
const USER_KEY  = 'bs_user';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [token,   setToken]   = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [loading, setLoading] = useState(true); // verifying token on mount

  /* ── keep axios header in sync with token ── */
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  /* ── verify stored token on app start ── */
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(r => { setUser(r.data); localStorage.setItem(USER_KEY, JSON.stringify(r.data)); })
      .catch(() => { _clear(); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── helpers ── */
  const _store = (tok, usr) => {
    localStorage.setItem(TOKEN_KEY, tok);
    localStorage.setItem(USER_KEY, JSON.stringify(usr));
    api.defaults.headers.common['Authorization'] = `Bearer ${tok}`;
    setToken(tok);
    setUser(usr);
  };

  const _clear = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  /* ── public API ── */
  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login-json', { email, password });
    _store(res.data.access_token, res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (name, email, password, role) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    _store(res.data.access_token, res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => { _clear(); }, []);

  const updateUser = useCallback((updated) => {
    const merged = { ...user, ...updated };
    localStorage.setItem(USER_KEY, JSON.stringify(merged));
    setUser(merged);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
