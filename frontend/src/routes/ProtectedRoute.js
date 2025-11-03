// components/ProtectedRoute.tsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute = () => {
  const token = localStorage.getItem('user.token');
  // add expiry check if needed using jwt-decode
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};
