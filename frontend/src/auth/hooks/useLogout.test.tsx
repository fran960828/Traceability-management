import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLogout } from './useLogout';
import { useAuth } from '../../shared/hooks/useAuth';
import { TokenStorage } from '../../shared/services/TokenStorage';
import { queryClient } from '../../shared/client/queryClient';

// 1. Mocks de las dependencias
vi.mock('../../shared/hooks/useAuth');
vi.mock('../../shared/services/TokenStorage');

// Mock de useNavigate (React Router)
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock del Singleton queryClient
vi.mock('../../shared/client/queryClient', () => ({
  queryClient: {
    clear: vi.fn(),
  },
}));

describe('useLogout Hook', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Configuramos el mock de useAuth
    (useAuth as any).mockReturnValue({ dispatch: mockDispatch });
  });

  it('debería ejecutar el protocolo completo de limpieza al cerrar sesión', () => {
    const { result } = renderHook(() => useLogout());

    // Ejecutamos el logout
    act(() => {
      result.current.logout();
    });

    // 1. VERIFICACIÓN FÍSICA: ¿Se borraron los tokens del localStorage?
    expect(TokenStorage.clear).toHaveBeenCalledTimes(1);

    // 2. VERIFICACIÓN DE SEGURIDAD: ¿Se vació la caché de datos de la bodega?
    expect(queryClient.clear).toHaveBeenCalledTimes(1);

    // 3. VERIFICACIÓN DE ESTADO: ¿Se notificó al contexto global?
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'LOGOUT' });

    // 4. VERIFICACIÓN DE NAVEGACIÓN: ¿Se redirigió al login reemplazando el historial?
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});