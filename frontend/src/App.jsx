import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import RadiologyNavbar from './components/layout/RadiologyNavbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { useAuth } from './context/AuthContext';

// Pages
import Workspace from './pages/Workspace';
import StudyDetail from './pages/StudyDetail';
import AdminHub from './pages/AdminHub';
import Profile from './pages/Profile';
import AuthLogin from './pages/AuthLogin';
import AuthRegister from './pages/AuthRegister';
import NotFound from './pages/NotFound';

function App() {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <>
      {!isAuthPage && <RadiologyNavbar />}
      <main className="main-wrapper">
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={user ? <Navigate to="/workspace" replace /> : <AuthLogin />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/workspace" replace /> : <AuthRegister />}
          />

          {/* Root Redirect */}
          <Route
            path="/"
            element={user ? <Navigate to="/workspace" replace /> : <Navigate to="/login" replace />}
          />

          {/* Protected User Workspace Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/upload" element={<Navigate to="/workspace#workstation" replace />} />
            <Route path="/scan/upload" element={<Navigate to="/workspace#workstation" replace />} />
            
            {/* Scrollable Section Redirects */}
            <Route path="/dashboard" element={<Navigate to="/workspace#analytics" replace />} />
            <Route path="/worklist" element={<Navigate to="/workspace#studies" replace />} />
            <Route path="/results" element={<Navigate to="/workspace#studies" replace />} />
            <Route path="/scan/results" element={<Navigate to="/workspace#studies" replace />} />
            <Route path="/reports" element={<Navigate to="/workspace#studies" replace />} />
            <Route path="/report" element={<Navigate to="/workspace#studies" replace />} />
            <Route path="/feedback" element={<Navigate to="/workspace#feedback" replace />} />
            
            {/* Benchmark routes removed */}
            <Route path="/benchmark" element={<Navigate to="/workspace#analytics" replace />} />
            <Route path="/comparison" element={<Navigate to="/workspace#analytics" replace />} />

            {/* Study Detail & Profile */}
            <Route path="/study/:id" element={<StudyDetail />} />
            <Route path="/scan/detail/:id" element={<StudyDetail />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Protected Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Navigate to="/admin/hub" replace />} />
            <Route path="/admin/hub" element={<AdminHub />} />
            <Route path="/admin/training" element={<AdminHub />} />
            <Route path="/admin/users" element={<AdminHub />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
