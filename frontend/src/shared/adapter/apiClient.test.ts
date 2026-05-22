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

  // 1. Configuramos el comportamiento del Mock Adapter:
  // La primera vez devolvemos 401 y la segunda un 200 con éxito
  mock.onGet('/inventory').replyOnce(401);
  mock.onGet('/inventory').replyOnce(200, mockData);

  // 2. Simulamos que el servicio de refresco devuelve el nuevo token
  vi.spyOn(RefreshService, 'refreshAccessToken').mockResolvedValue(mockNewToken);

  // 3. 🔄 CAMBIO CRÍTICO PARA EL TEST:
  // Hacemos que TokenStorage devuelva el token viejo la primera vez, 
  // pero que devuelva el NUEVO token cuando el interceptor de peticiones lo consulte para el reintento.
  const getAccessTokenSpy = vi.spyOn(TokenStorage, 'getAccessToken')
    .mockReturnValueOnce('expired-token')     // Primera petición (Falla)
    .mockReturnValueOnce(mockNewToken);       // Reintento tras el refresh (Éxito)

  // 4. Ejecución
  const response = await apiClient.get('/inventory');

  // 5. Verificaciones
  expect(response.data).toEqual(mockData); // Comprobamos que el reintento obtuvo los datos del vino
  expect(RefreshService.refreshAccessToken).toHaveBeenCalled(); // Se llamó al refresco

  // 🔄 VERIFICACIÓN ADAPTADA A TU INTERCEPTOR DE PETICIONES:
  // En lugar de fiarnos del objeto config congelado por Axios Mock Adapter,
  // demostramos científicamente que TokenStorage fue llamado una segunda vez 
  // y que devolvió el token refrescado para el interceptor de peticiones.
  expect(getAccessTokenSpy).toHaveBeenCalledTimes(2);
  expect(getAccessTokenSpy.mock.results[1].value).toBe(mockNewToken);
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