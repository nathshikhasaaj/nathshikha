import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem('nw-customer-user') || 'null') ||
        JSON.parse(localStorage.getItem('nw-admin-user') || 'null')
      );
    } catch {
      return null;
    }
  });

  const [adminUser, setAdminUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nw-admin-user') || 'null');
    } catch {
      return null;
    }
  });

  const { setToast } = useToast();

  useEffect(() => {
    // Clear old legacy keys
    localStorage.removeItem('nw-token');
    localStorage.removeItem('nw-user');

    const customerToken = localStorage.getItem('nw-customer-token');
    if (customerToken) {
      api('/auth/me')
        .then((x) => {
          if (x.user) {
            setUser(x.user);
            localStorage.setItem('nw-customer-user', JSON.stringify(x.user));
          }
        })
        .catch(() => {
          localStorage.removeItem('nw-customer-token');
          localStorage.removeItem('nw-customer-user');
          if (!localStorage.getItem('nw-admin-token')) {
            setUser(null);
          }
        });
    }

    const adminToken = localStorage.getItem('nw-admin-token');
    if (adminToken) {
      api('/auth/me')
        .then((x) => {
          if (x.user?.role === 'admin') {
            setAdminUser(x.user);
            localStorage.setItem('nw-admin-user', JSON.stringify(x.user));
            if (!localStorage.getItem('nw-customer-token')) {
              setUser(x.user);
            }
          }
        })
        .catch(() => {
          localStorage.removeItem('nw-admin-token');
          localStorage.removeItem('nw-admin-user');
          setAdminUser(null);
        });
    }
  }, []);

  const loginCustomer = (userData, token) => {
    localStorage.setItem('nw-customer-token', token);
    localStorage.setItem('nw-customer-user', JSON.stringify(userData));
    setUser(userData);
  };

  const logoutCustomer = () => {
    localStorage.removeItem('nw-customer-token');
    localStorage.removeItem('nw-customer-user');
    setUser(null);
    setToast('Logged out');
  };

  const loginAdmin = (adminData, token) => {
    localStorage.setItem('nw-admin-token', token);
    localStorage.setItem('nw-admin-user', JSON.stringify(adminData));
    setAdminUser(adminData);
    if (!localStorage.getItem('nw-customer-token')) {
      setUser(adminData);
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem('nw-admin-token');
    localStorage.removeItem('nw-admin-user');
    setAdminUser(null);
    if (user?.role === 'admin') {
      setUser(null);
    }
    setToast('Admin logged out');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        adminUser,
        setAdminUser,
        loginCustomer,
        logoutCustomer,
        loginAdmin,
        logoutAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
