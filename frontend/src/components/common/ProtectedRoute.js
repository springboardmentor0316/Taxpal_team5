import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const isAuthenticated = () => Boolean(localStorage.getItem('taxpal_token'));

const ProtectedRoute = ({ children, redirectTo = '/signin' }) => {
  if (!isAuthenticated()) {
    return <Navigate to={redirectTo} replace />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
