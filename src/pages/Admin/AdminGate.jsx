import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';

export default function AdminGate({ products, refreshProducts }) {
  const { adminUser } = useAuth();

  if (!adminUser || adminUser.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return <AdminDashboard products={products} refreshProducts={refreshProducts} />;
}
