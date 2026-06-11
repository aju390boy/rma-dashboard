import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosClient, { setAccessToken, getAccessToken } from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, try silent refresh to restore session
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await axiosClient.post('/auth/refresh');
        setAccessToken(data.data.accessToken);
        const meRes = await axiosClient.get('/auth/me');
        setUser(meRes.data.data.user);
      } catch {
        // No valid session — user stays null
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await axiosClient.post('/auth/login', { email, password });
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const isAdmin = user?.role === 'admin';
  const isSupport = user?.role === 'support' || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isSupport }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
