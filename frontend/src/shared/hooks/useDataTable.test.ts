// src/shared/hooks/useDataTable.test.tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDataTable } from './useDataTable';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

const mockFetchFn = vi.fn();

// Wrapper utilizando React.createElement para mayor compatibilidad
const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { 
      queries: { 
        retry: false,
        gcTime: 0 // Evita que queden datos en caché entre tests
      } 
    },
  });

  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(
      MemoryRouter,
      { initialEntries: ['/suppliers?page=1&name=test'] },
      children
    )
  );
};

describe('useDataTable Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Happy Path: Debería leer filtros de la URL y llamar a fetchFn', async () => {
    mockFetchFn.mockResolvedValue({ results: [], count: 0 });

    renderHook(() => useDataTable({ key: 'test', fetchFn: mockFetchFn }), { wrapper });

    expect(mockFetchFn).toHaveBeenCalledWith({
      page: '1',
      name: 'test'
    });
  });

  it('Filters: updateFilters debería limpiar valores vacíos y actualizar la URL', async () => {
    mockFetchFn.mockResolvedValue({ results: [], count: 0 });
    
    const { result } = renderHook(
        () => useDataTable({ key: 'test', fetchFn: mockFetchFn }), 
        { wrapper }
    );

    // 1. Ejecutamos el cambio
    act(() => {
        result.current.updateFilters({ 
        name: '',       // Debe limpiarse
        page: 2,        // Debe actualizarse
        category: undefined // Debe ignorarse
        });
    });

    // 2. Esperamos a que el hook reaccione al cambio de la URL
    await waitFor(() => {
        expect(result.current.filters).toEqual({ 
        page: '2' 
        });
    }, { timeout: 1000 });
});

  it('Edge Case: Debería manejar errores de la fetchFn', async () => {
    mockFetchFn.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useDataTable({ key: 'test', fetchFn: mockFetchFn }), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});