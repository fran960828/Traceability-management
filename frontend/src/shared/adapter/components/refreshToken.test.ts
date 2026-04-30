import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { refreshAccessToken } from './refreshToken';
import { TokenStorage } from '../../services/TokenStorage';

// 1. Mockeamos las dependencias externas
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));
vi.mock('../../services/TokenStorage', () => ({
  TokenStorage: {
    getRefreshToken: vi.fn(),
    updateAccessToken: vi.fn(),
  }
}));

describe('refreshAccessToken', () => {
  const API_URL = 'http://localhost:8009/api';

  beforeEach(() => {
    vi.clearAllMocks();

  });

  // --- HAPPY PATH ---
  it('debería obtener un nuevo access token y guardarlo cuando el refresh token es válido', async () => {
    // Preparación
    const mockRefreshToken = 'valid-refresh';
    const mockNewAccess = 'new-access-token';
    
    // Configuramos los mocks
    vi.mocked(TokenStorage.getRefreshToken).mockReturnValue(mockRefreshToken);
    vi.mocked(axios.post).mockResolvedValue({ data: { access: mockNewAccess } });

    // Ejecución
    const result = await refreshAccessToken(API_URL);

    // Verificaciones
    expect(axios.post).toHaveBeenCalledWith(`${API_URL}/token/refresh/`, {
      refresh: mockRefreshToken,
    });
    expect(TokenStorage.updateAccessToken).toHaveBeenCalledWith(mockNewAccess);
    expect(result).toBe(mockNewAccess);
  });

  // --- EDGE CASES ---

  it('debería lanzar un error si no hay refresh token en el storage', async () => {
    // Simulamos que el storage está vacío
    vi.mocked(TokenStorage.getRefreshToken).mockReturnValue(null);

    await expect(refreshAccessToken(API_URL)).rejects.toThrow('No refresh token available');
    
    // Verificamos que ni siquiera se intentó llamar a la API
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('debería propagar el error si el servidor de Django responde con error (401/403)', async () => {
    vi.mocked(TokenStorage.getRefreshToken).mockReturnValue('expired-refresh');
    
    // Simulamos fallo de red/servidor
    const errorResponse = { response: { status: 401, data: { detail: 'Token invalid' } } };
    vi.mocked(axios.post).mockRejectedValue(errorResponse);

    await expect(refreshAccessToken(API_URL)).rejects.toEqual(errorResponse);
  });

  it('debería fallar si la respuesta del servidor no tiene el formato esperado', async () => {
    vi.mocked(TokenStorage.getRefreshToken).mockReturnValue('valid-refresh');
    
    // Simulamos que Django responde 200 OK pero por algún error el JSON no trae 'access'
    vi.mocked(axios.post).mockResolvedValue({ data: { unexpected_field: 'oops' } });

    // En JS esto resultará en que intentaremos leer .access de algo que no existe
    await expect(refreshAccessToken(API_URL))
  .rejects.toThrow("Invalid refresh response: Access token missing");
    // Nota: Aquí podrías añadir una validación en tu código para que lance error si no hay access
  });
});