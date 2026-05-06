import { useAuth } from '../../shared/hooks/useAuth';
import { TokenStorage } from '../../shared/services/TokenStorage';
import { useNavigate } from 'react-router-dom';
import { queryClient } from '../../shared/client'; 

export const useLogout = () => {
  const { dispatch } = useAuth();
  const navigate = useNavigate();

  const logout = () => {
    // 1. Limpieza de Persistencia Física
    TokenStorage.clear();

    // 2. Limpieza de Memoria Cache (TanStack Query)
    queryClient.clear();

    // 3. Reset del Estado Global (Contexto)
    dispatch({ type: 'LOGOUT' });

    // 4. Redirección Controlada
    navigate('/login', { replace: true });
  };

  return { logout };
};