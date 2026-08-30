import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, adminUser } = useAuth();

  if (adminOnly) {
    if (!adminUser || adminUser.role !== 'admin') {
      return <Navigate to="/admin/login" replace />;
    }
    return children;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
