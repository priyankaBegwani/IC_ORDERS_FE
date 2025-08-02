import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import AuthForm from './components/AuthForm';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import DesignEntry from './components/DesignEntry';
import PartyEntry from './components/PartyEntry';
import Reports from './components/Reports';
import TransportEntry from './components/TransportEntry';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

const PlaceholderComponent: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600">This feature is coming soon!</p>
    </div>
  </div>
);

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <AuthForm />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DataProvider>
                <Layout>
                  <Dashboard />
                </Layout>
              </DataProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/party-entry"
          element={
            <ProtectedRoute>
              <DataProvider>
                <Layout>
                  <PartyEntry />
                </Layout>
              </DataProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/design-entry"
          element={
            <ProtectedRoute>
              <DataProvider>
                <Layout>
                  <DesignEntry />
                </Layout>
              </DataProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/orders"
          element={
            <ProtectedRoute>
              <DataProvider>
                <Layout>
                  <Orders />
                </Layout>
              </DataProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/reports"
          element={
            <ProtectedRoute>
              <DataProvider>
                <Layout>
                  <Reports />
                </Layout>
              </DataProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/transport-entry"
          element={
            <ProtectedRoute>
              <DataProvider>
                <Layout>
                  <TransportEntry />
                </Layout>
              </DataProvider>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;