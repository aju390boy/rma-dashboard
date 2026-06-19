import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { SocketProvider } from './contexts/SocketContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import RMAQueue from './pages/RMAQueue';
import Analytics from './pages/Analytics';

const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};

const AuthenticatedApp = ({ children }) => (
  <SocketProvider>{children}</SocketProvider>
);

const App = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRoles={['admin', 'support']}>
            <AuthenticatedApp>
              <AppLayout><Dashboard /></AppLayout>
            </AuthenticatedApp>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute requiredRoles={['admin', 'support']}>
            <AuthenticatedApp>
              <AppLayout><Orders /></AppLayout>
            </AuthenticatedApp>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rma"
        element={
          <ProtectedRoute requiredRoles={['admin', 'support']}>
            <AuthenticatedApp>
              <AppLayout><RMAQueue /></AppLayout>
            </AuthenticatedApp>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute requiredRoles={['admin', 'support']}>
            <AuthenticatedApp>
              <AppLayout><Analytics /></AppLayout>
            </AuthenticatedApp>
          </ProtectedRoute>
        }
      />

      <Route
        path="/unauthorized"
        element={
          <div className="loading-screen">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
              <h2 style={{ color: 'var(--text-primary)' }}>Access Denied</h2>
              <p style={{ color: 'var(--text-muted)' }}>You don't have permission to view this page.</p>
            </div>
          </div>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
