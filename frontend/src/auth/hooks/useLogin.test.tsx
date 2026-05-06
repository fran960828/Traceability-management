import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useLogin } from './useLogin';
import { authService } from '../services/auth.service';
import { useAuth } from '../../shared/hooks/useAuth';
import { TokenStorage } from '../../shared/services/TokenStorage';
import { ROLES } from '../../shared/models/';

// 1. Mocks de las dependencias
vi.mock('../services/auth.service');
vi.mock('../../shared/hooks/useAuth');
vi.mock('../../shared/services/TokenStorage');

// Mock de useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('useLogin Hook', () => {
  let queryClient: QueryClient;
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    
    // Configuramos el mock de useAuth para que devuelva el dispatch
    (useAuth as any).mockReturnValue({ dispatch: mockDispatch });
  });

  // Wrapper para proveer los contextos necesarios (Query y Router)
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  it('debería ejecutar el flujo completo de login con éxito', async () => {
    const mockCredentials = { username: 'enologo1', password: 'A123456789_w' };
    const mockResponse = {
      access: 'access-token',
      refresh: 'refresh-token',
      username: 'enologo1',
      role: ROLES.ENOLOGO,
    };

    // Simulamos éxito en el servicio
    (authService.login as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLogin(), { wrapper });

    // Ejecutamos la mutación
    result.current.mutate(mockCredentials);

    // Esperamos a que la mutación termine (isSuccess)
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // VERIFICACIONES:
    // 1. ¿Se guardaron los datos en el storage?
    expect(TokenStorage.saveAuthData).toHaveBeenCalledWith(mockResponse);

    // 2. ¿Se actualizó el estado global (Contexto)?
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'LOGIN',
      payload: { username: 'enologo1', role: ROLES.ENOLOGO },
    });

    // 3. ¿Se redirigió al dashboard?
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('debería manejar el error si las credenciales son incorrectas', async () => {
    const mockError = { response: { data: { detail: 'No active account found' } } };
    (authService.login as any).mockRejectedValue(mockError);

    const { result } = renderHook(() => useLogin(), { wrapper });

    result.current.mutate({ username: 'mal', password: 'mal' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verificamos que NO se llamó a la navegación ni al dispatch
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    // El error debe estar disponible en el hook para la UI
    expect(result.current.error).toEqual(mockError);
  });

  it('debería manejar el error cuando el servidor responde con un formato inesperado', async () => {
      // Caso: El servidor responde 200 pero con basura (fallará Zod en el servicio)
      const zodError = new Error('Zod Validation Failed');
      
      (authService.login as any).mockRejectedValue(zodError);

      const { result } = renderHook(() => useLogin(), { wrapper });

      result.current.mutate({ username: 'user', password: 'password' });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Verificación de integridad: No se debe loguear a nadie si los datos son basura
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(TokenStorage.saveAuthData).not.toHaveBeenCalled();
      expect(result.current.error).toEqual(zodError);
    });

    it('debería manejar un error de red (500 Server Error) sin romper la app', async () => {
      const networkError = { 
        isAxiosError: true, 
        response: { status: 500, data: { detail: 'Internal Server Error' } } 
      };
      (authService.login as any).mockRejectedValue(networkError);

      const { result } = renderHook(() => useLogin(), { wrapper });

      result.current.mutate({ username: 'admin', password: '123' });

      await waitFor(() => expect(result.current.isError).toBe(true));
      
      expect(result.current.error?.response?.status).toBe(500);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('debería mantener el estado "loading" (isPending) mientras la petición está en vuelo', async () => {
      // Creamos una promesa que no se resuelve inmediatamente
      let resolveAuth: any;
      const promise = new Promise((resolve) => { resolveAuth = resolve; });
      (authService.login as any).mockReturnValue(promise);

      const { result } = renderHook(() => useLogin(), { wrapper });

      result.current.mutate({ username: 'enologo', password: 'password' });

      // Verificamos que el estado de carga es verdadero
      await waitFor(() => {
    expect(result.current.isPending).toBe(true);
  });

      // Resolvemos para limpiar el test
      resolveAuth({ username: 'enologo', role: ROLES.ENOLOGO });
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
});