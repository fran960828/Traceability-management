import { apiClient } from '../../shared/adapter/apiClient';
import type{ AuthResponse} from '../../shared/models/auth.schema';
import { AuthResponseSchema} from '../../shared/models/auth.schema';
import type{ LoginCredentials } from '../models';

/**
 * AuthService: Responsable único de la comunicación física con los endpoints de identidad.
 * Aplicamos el principio de "Single Responsibility" (Solid).
 */
export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      // 1. Petición física usando nuestro cliente orquestado.
      // El generic <AuthResponse> ayuda a TS, pero no garantiza la realidad en ejecución.
      const { data } = await apiClient.post<AuthResponse>('auth/login/', credentials);

      // 2. ADUANA DE DATOS (Zod): 
      // Validamos que lo que Django envió cumple el contrato EXACTAMENTE.
      // Si falta un campo o un tipo es incorrecto, saltará al catch.
      return AuthResponseSchema.parse(data);
      
    } catch (error) {
      // 3. MANEJO DE ERRORES PROFESIONAL:
      // Delegamos el error para que useMutation lo capture, 
      // pero podríamos loguear métricas aquí si fuera necesario.
      throw error; 
    }
  },

  /**
   * Aunque el logout suele ser limpiar el storage local, a veces el backend
   * necesita invalidar el refresh token (Blacklisting).
   */
  logout: async (refreshToken: string): Promise<void> => {
    if (!refreshToken) return;
    
    try {
      // Avisamos al backend para que invalide esta sesión
      await apiClient.post('auth/logout/', { refresh: refreshToken });
    } catch (error) {
      // En logout, a veces fallar no es crítico para el cliente,
      // pero lo registramos para depuración.
      console.error('Error al informar logout al servidor', error);
    }
  }
};