import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';
import { apiClient } from '../../shared/adapter/apiClient';
import { AuthResponseSchema } from '../../shared/models';

// Mockeamos el apiClient de forma global para este archivo
vi.mock('../../shared/adapter/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- HAPPY PATH ---
  describe('login() - Éxito', () => {
    it('debería retornar datos validados cuando Django responde con 200', async () => {
      const mockCredentials = { username: 'enologo1', password: 'password123' };
      const mockResponse = {
        access: 'access-token-123',
        refresh: 'refresh-token-123',
        username: 'enologo1',
        role: 'ENOLOGO'
      };

      // Simulamos respuesta exitosa de Axios
      (apiClient.post as any).mockResolvedValue({ data: mockResponse });

      const result = await authService.login(mockCredentials);

      // Verificaciones
      expect(apiClient.post).toHaveBeenCalledWith('auth/login/', mockCredentials);
      expect(result).toEqual(mockResponse);
      // Verificamos que pasó por la validación de Zod con éxito
      expect(() => AuthResponseSchema.parse(result)).not.toThrow();
    });
  });

  // --- EDGE CASES / ERROR HANDLING ---
  describe('login() - Errores', () => {
    it('debería lanzar error si Django devuelve datos que no cumplen el esquema (Zod)', async () => {
      const mockIncompleteResponse = { access: 'token-solo' }; // Falta refresh, role, etc.
      
      (apiClient.post as any).mockResolvedValue({ data: mockIncompleteResponse });

      // Esperamos que falle no por la red, sino por la "aduana" de Zod
      await expect(authService.login({ username: 'u', password: 'p' }))
        .rejects.toThrow();
    });

    it('debería propagar el error si la petición de red falla (401, 500, etc.)', async () => {
      const networkError = new Error('401 Unauthorized');
      (apiClient.post as any).mockRejectedValue(networkError);

      await expect(authService.login({ username: 'u', password: 'p' }))
        .rejects.toThrow('401 Unauthorized');
    });
  });

  describe('logout()', () => {
    it('debería llamar al endpoint de logout con el refresh token', async () => {
      const refreshToken = 'token-para-quemar';
      (apiClient.post as any).mockResolvedValue({});

      await authService.logout(refreshToken);

      expect(apiClient.post).toHaveBeenCalledWith('auth/logout/', { refresh: refreshToken });
    });

    it('no debería hacer nada si no se proporciona un refresh token', async () => {
      await authService.logout('');
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });
});