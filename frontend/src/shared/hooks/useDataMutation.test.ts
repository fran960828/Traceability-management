import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDataMutation } from './useDataMutation';

// 1. Configuración del QueryClient para tests
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// 2. Wrapper con React.createElement para máxima compatibilidad
const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    children
  );
};

describe('useDataMutation Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  it('Happy Path: Debería ejecutar onSuccess e invalidar queries', async () => {
    // Mocks
    const mockMutationFn = vi.fn().mockResolvedValue({ id: 1 });
    const successSpy = vi.fn();
    
    // Espiamos el método del QueryClient que ya vive en el wrapper
    const invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');

    const { result } = renderHook(() => useDataMutation({
      mutationFn: mockMutationFn,
      invalidateKeys: ['suppliers'],
      onSuccess: successSpy
    }), { wrapper });

    // Ejecutar mutación
    result.current.mutate({ name: 'Nuevo' });

    // Esperar éxito
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // VALIDACIONES ROBUSTAS:
    
    // A. Verificamos que la API recibió nuestra data (primer argumento de la 1ª llamada)
    expect(mockMutationFn.mock.calls[0][0]).toEqual({ name: 'Nuevo' });

    // B. Verificamos que el callback de éxito recibió la respuesta de la API
    expect(successSpy.mock.calls[0][0]).toEqual({ id: 1 });

    // C. Verificamos la invalidación de la caché
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ 
        queryKey: ['suppliers'] 
      })
    );
  });

  it('Edge Case: Debería ejecutar onError cuando la mutación falla', async () => {
    const mockError = { response: { data: { message: 'Error de servidor' } } };
    const mockMutationFn = vi.fn().mockRejectedValue(mockError);
    const errorSpy = vi.fn();

    const { result } = renderHook(() => useDataMutation({
      mutationFn: mockMutationFn,
      onError: errorSpy
    }), { wrapper });

    result.current.mutate({ name: 'Fallo' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verificamos que el error se propagó al callback
    expect(errorSpy).toHaveBeenCalledWith(mockError);
    expect(result.current.error).toEqual(mockError);
  });
});