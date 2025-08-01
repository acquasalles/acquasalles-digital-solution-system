import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider, { useAuth } from './components/AuthProvider';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { AdminPage } from './components/AdminPage';
import { DashboardPage } from './components/DashboardPage';
import { ClientUsersPage } from './components/ClientUsersPage';
import { WaterQualityReportDemo } from './components/WaterQualityReportDemo';
import { ClientsProvider } from './lib/ClientsContext';
import { IntlProvider } from './i18n/IntlProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  if (requireAdmin && !isAdmin) return <Navigate to="/admin" />;
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <IntlProvider>
          <ClientsProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-users"
                element={
                  <ProtectedRoute requireAdmin>
                    <ClientUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/water-quality-demo" element={<WaterQualityReportDemo />} />
              <Route path="/" element={<Navigate to="/admin" />} />
            </Routes>
          </ClientsProvider>
        </IntlProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;