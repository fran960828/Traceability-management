// src/shared/router/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = () => {
  const { state } = useAuth();
  
  if (!state.isInitialized) return <div>Cargando bodega...</div>;
  return state.isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

