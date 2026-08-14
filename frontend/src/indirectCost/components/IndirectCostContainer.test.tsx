// src/modules/pricing/components/containers/__tests__/IndirectCostContainer.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ModalProvider } from '../../shared/components/modal/context/ModalContext';
import { IndirectCostContainer } from './IndirectCostContainer';
import { useDataTable } from '../../shared/hooks';

// Mockeamos las dependencias de hooks y servicios de red
vi.mock('../../shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/hooks')>();
  return {
    ...actual,
    useDataTable: vi.fn(),
    useDataMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('../services/indirectCost.service', () => ({
  IndirectCostService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('IndirectCostContainer - Deep Integration Tests', () => {
  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

  const mockIndirectCostData = {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        name: 'Tasas Generales 2026',
        labor_rate: '0.1200',
        energy_rate: '0.0450',
        amortization_rate: '0.0800',
        is_active: true,
        created_at: '2026-08-12T10:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Configuramos el contenedor del portal modal en el DOM de pruebas
    if (!document.getElementById('modal-root')) {
      const modalRoot = document.createElement('div');
      modalRoot.setAttribute('id', 'modal-root');
      document.body.appendChild(modalRoot);
    }
  });

  const renderContainer = () => {
    const queryClient = createTestQueryClient();
    return render(
      <MemoryRouter initialEntries={['/']}>
        <QueryClientProvider client={queryClient}>
          <ModalProvider>
            <IndirectCostContainer />
          </ModalProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it('1. Debe mostrar el placeholder de carga mientras isLoading está activo', () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      filters: { search: '', is_active: '', page: '1' },
      updateFilters: vi.fn(),
    } as any);

    renderContainer();
    expect(screen.getByText(/Cargando configuraciones de costes indirectos.../i)).toBeInTheDocument();
  });

  it('2. Debe renderizar las cabeceras y los datos de la configuración si la API responde con éxito', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: mockIndirectCostData,
      isLoading: false,
      isError: false,
      filters: { search: '', is_active: '', page: '1' },
      updateFilters: vi.fn(),
    } as any);

    renderContainer();

    await waitFor(() => {
      expect(screen.queryByText(/Cargando configuraciones de costes indirectos.../i)).not.toBeInTheDocument();
    });

    // Validamos cabeceras críticas de la tabla
    expect(screen.getByText('Configuración / Ejercicio')).toBeInTheDocument();
    expect(screen.getByText('Mano de Obra')).toBeInTheDocument();
    expect(screen.getByText('Energía')).toBeInTheDocument();
    expect(screen.getByText('Amortización')).toBeInTheDocument();
    expect(screen.getByText('Tasa Total')).toBeInTheDocument();

    // Validamos valores formateados de la fila
    expect(screen.getByText('Tasas Generales 2026')).toBeInTheDocument();
    expect(screen.getByText('0.1200 €')).toBeInTheDocument();
    expect(screen.getByText('0.0450 €')).toBeInTheDocument();
    expect(screen.getByText('0.0800 €')).toBeInTheDocument();
    expect(screen.getByText('0.2450 €/ud')).toBeInTheDocument(); // 0.12 + 0.045 + 0.08
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('3. Debe pintar el estado vacío si la lista de resultados de Django viene a cero', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: { count: 0, next: null, previous: null, results: [] },
      isLoading: false,
      isError: false,
      filters: { search: '', is_active: '', page: '1' },
      updateFilters: vi.fn(),
    } as any);

    renderContainer();

    await waitFor(() => {
      expect(screen.getByText('No se han localizado configuraciones de tasas indirectas.')).toBeInTheDocument();
    });
  });

  it('4. Debe levantar el portal modal de creación al accionar el botón superior', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: mockIndirectCostData,
      isLoading: false,
      isError: false,
      filters: { search: '', is_active: '', page: '1' },
      updateFilters: vi.fn(),
    } as any);

    renderContainer();

    const createBtn = screen.getByRole('button', { name: /Nueva Configuración/i });
    fireEvent.click(createBtn);

    expect(await screen.findByRole('heading', { name: 'Nueva Configuración de Tasas' })).toBeInTheDocument();
  });

  it('5. Debe renderizar la UI de error si falla la comunicación con el servidor', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      filters: { search: '', is_active: '', page: '1' },
      updateFilters: vi.fn(),
    } as any);

    renderContainer();

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar las configuraciones de costes indirectos/i)).toBeInTheDocument();
    });
  });
});