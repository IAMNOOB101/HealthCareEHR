import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

/**
 * Protects any patient portal route.
 * Redirects to /portal/login if no portal token exists.
 */
const PortalProtectedRoute = ({ children }) => {
  const { token } = useSelector((s) => s.portalAuth);

  if (!token) {
    return <Navigate to="/portal/login" replace />;
  }

  return children;
};

export default PortalProtectedRoute;
