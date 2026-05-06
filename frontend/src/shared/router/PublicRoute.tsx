// src/shared/router/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// src/shared/router/PublicRoute.tsx
export const PublicRoute = () => {
  const { state } = useAuth();
  return !state.isAuthenticated ? <Outlet /> : <Navigate to="/dashboard" replace />;
};