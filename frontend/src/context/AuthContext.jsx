import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await authAPI.getMe();
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await authAPI.login({ email, password });
      if (res.data.success) {
        setUser(res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, message: res.data.message || 'Login failed' };
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const res = await authAPI.register(userData);
      if (res.data.success) {
        setUser(res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, message: res.data.message || 'Registration failed' };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
