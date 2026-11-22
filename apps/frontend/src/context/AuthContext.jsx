'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage once mounted
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('auth_user');
      const savedToken = localStorage.getItem('auth_token');
      const savedCompany = localStorage.getItem('auth_company');

      if (savedUser) setUser(JSON.parse(savedUser));
      if (savedToken) setToken(savedToken);
      if (savedCompany) setCompany(JSON.parse(savedCompany));
    } catch (e) {
      console.error('Failed to parse auth from storage', e);
    }
  }, []);

  // Validate session on app launch
  const checkAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken) {
      setUser(null);
      setCompany(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data.user);
      setCompany(res.data.data.company);
      localStorage.setItem('auth_user', JSON.stringify(res.data.data.user));
      if (res.data.data.company) {
        localStorage.setItem('auth_company', JSON.stringify(res.data.data.company));
      }
    } catch (err) {
      // If 401 or company frozen, logout
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login handler
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: authToken, user: authUser, company: authCompany } = res.data.data;

    setToken(authToken);
    setUser(authUser);
    setCompany(authCompany);

    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('auth_user', JSON.stringify(authUser));
    if (authCompany) {
      localStorage.setItem('auth_company', JSON.stringify(authCompany));
    }

    return { user: authUser, company: authCompany };
  };

  // Logout handler
  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch {
      // Ignore API failure on logout
    } finally {
      setToken(null);
      setUser(null);
      setCompany(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_company');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        company,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

