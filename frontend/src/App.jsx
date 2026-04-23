import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from './store/slices/authSlice';

import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PortalProtectedRoute from './components/PortalProtectedRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';

// Staff Pages
import Dashboard     from './pages/Dashboard';
import PatientsList   from './pages/PatientsList';
import PatientProfile from './pages/PatientProfile';
import PatientDetail from './pages/PatientDetail';
import Documentation from './pages/Documentation';
import Orders        from './pages/Orders';
import Medications   from './pages/Medications';
import Appointments  from './pages/Appointments';
import Doctors       from './pages/Doctors';
import AuditLogs     from './pages/AuditLogs';
import Settings      from './pages/Settings';

// Patient Portal Pages
import PatientPortalLogin     from './pages/portal/PatientPortalLogin';
import PatientPortalRegister  from './pages/portal/PatientPortalRegister';
import PatientDashboard       from './pages/portal/PatientDashboard';
import PortalForgotPassword   from './pages/portal/PortalForgotPassword';

function App() {
  const dispatch = useDispatch();

  // Listen for 401 events emitted by axiosClient (avoids circular import)
  useEffect(() => {
    const handleUnauthorized = () => {
      dispatch(logout());
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Staff Public Routes ──────────────────────────────────────────── */}
        <Route path="/login"            element={<Login />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />

        {/* ── Staff Application — all protected ───────────────────────────── */}
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index                 element={<Dashboard />} />
          <Route path="patients"       element={<PatientsList />} />
          <Route path="patients/:id"   element={<PatientDetail />} />
          <Route path="profile"        element={<PatientProfile />} />
          <Route path="appointments"   element={<Appointments />} />
          <Route path="documentation"  element={<Documentation />} />
          <Route path="orders"         element={<Orders />} />
          <Route path="medications"    element={<Medications />} />
          <Route path="doctors"        element={<Doctors />} />
          <Route path="audit-logs"     element={<AuditLogs />} />
          <Route path="settings"       element={<Settings />} />
          {/* Catch-all inside layout */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        {/* ── Patient Portal Public Routes ─────────────────────────────────── */}
        <Route path="/portal/login"             element={<PatientPortalLogin />} />
        <Route path="/portal/register"          element={<PatientPortalRegister />} />
        <Route path="/portal/forgot-password"   element={<PortalForgotPassword />} />

        {/* ── Patient Portal Protected Routes ─────────────────────────────── */}
        <Route path="/portal/dashboard" element={
          <PortalProtectedRoute><PatientDashboard /></PortalProtectedRoute>
        } />
        {/* Redirect /portal → /portal/login */}
        <Route path="/portal" element={<Navigate to="/portal/login" replace />} />

        {/* Global catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
