import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './apiClient';
import { TokenStorage } from '../services/TokenStorage';
import * as RefreshService from './components';
import MockAdapter from 'axios-mock-adapter';

// Mockeamos el servicio de refresh y el storage
vi.mock('../services/TokenStorage');
vi.mock('./component/refreshToken');

describe('apiClient Integration', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    vi.clearAllMocks();
    localStorage.clear();
  });

  // --- HAPPY PATH: SILENT REFRESH ---
  it('debería refrescar el token y reintentar la petición automáticamente tras un 401', async () => {
    const mockNewToken = 'new-access-token';
    const mockData = { id: 1, name: 'Vino Tinto Reserva' };

    // 1. Configuramos el comportamiento:
    // La primera vez que pida /inventory, devolvemos 401
    mock.onGet('/inventory').replyOnce(401);
    // La segunda vez (reintento), devolvemos 200 con datos
    mock.onGet('/inventory').replyOnce(200, mockData);

    // 2. Simulamos que el refresh funciona y devuelve el nuevo token
    vi.spyOn(RefreshService, 'refreshAccessToken').mockResolvedValue(mockNewToken);
    vi.mocked(TokenStorage.getAccessToken).mockReturnValue('expired-token');

    // 3. Ejecución
    const response = await apiClient.get('/inventory');

    // 4. Verificaciones
    expect(response.data).toEqual(mockData);
    expect(RefreshService.refreshAccessToken).toHaveBeenCalled();
    // Verificamos que el reintento llevó el nuevo token en el header
    expect(response.config.headers.Authorization).toBe(`Bearer ${mockNewToken}`);
  });

  // --- EDGE CASE: FALLO TOTAL DE AUTENTICACIÓN ---
  it('debería limpiar el storage y redirigir si el refresh también falla', async () => {
    // Simulamos fallo 401 persistente
    mock.onGet('/protected').reply(401);
    
    // El servicio de refresh lanza error (ej: refresh token caducado)
    vi.spyOn(RefreshService, 'refreshAccessToken').mockRejectedValue(new Error('Refresh expired'));
    
    await expect(apiClient.get('/protected')).rejects.toThrow();
    
    expect(TokenStorage.clear).toHaveBeenCalled();
  });

  // --- EDGE CASE: PETICIONES SIMULTÁNEAS (COLA) ---
  it('debería encolar múltiples peticiones y resolverlas todas con un solo refresh', async () => {
    const mockNewToken = 'shared-token';
    
    // Dos peticiones fallan con 401
    mock.onGet('/req1').replyOnce(401);
    mock.onGet('/req1').replyOnce(200, { ok: 1 });
    mock.onGet('/req2').replyOnce(401);
    mock.onGet('/req2').replyOnce(200, { ok: 2 });

    vi.spyOn(RefreshService, 'refreshAccessToken').mockResolvedValue(mockNewToken);

    // Lanzamos ambas a la vez
    const [res1, res2] = await Promise.all([
      apiClient.get('/req1'),
      apiClient.get('/req2')
    ]);

    expect(res1.data.ok).toBe(1);
    expect(res2.data.ok).toBe(2);
    // CRÍTICO: Aunque fallaron dos, solo se debió llamar a refresh UNA vez
    expect(RefreshService.refreshAccessToken).toHaveBeenCalledTimes(1);
  });
});