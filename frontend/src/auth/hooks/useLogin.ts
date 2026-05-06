import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios'; // Importamos el tipo de Axios
import { authService } from '../services/auth.service';
import { useAuth } from '../../shared/hooks/useAuth';
import { TokenStorage } from '../../shared/services/TokenStorage';
import type { LoginCredentials } from '../models';
import type { AuthResponse } from '../../shared/models/auth.schema';

export const useLogin = () => {
  const navigate = useNavigate();
  const { dispatch } = useAuth();

  return useMutation<AuthResponse, AxiosError<{ detail: string }>, LoginCredentials>({
    
    mutationFn: (credentials) => authService.login(credentials),

    onSuccess: (data) => {
      TokenStorage.saveAuthData(data);

      dispatch({ 
        type: 'LOGIN', 
        payload: {
          username: data.username,
          role: data.role,
        } 
      });

      navigate('/dashboard', { replace: true });
    },

    onError: (error) => {
      // Ahora 'error' ya no es any. Es un AxiosError.
      // Podemos acceder a la respuesta de Django de forma segura:
      const errorMessage = error.response?.data?.detail || 'Error inesperado en la bodega';
      console.error('Error en el proceso de login:', errorMessage);
      
    },
  });
};