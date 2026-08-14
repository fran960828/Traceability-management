// src/modules/traceability/components/containers/__tests__/TraceabilityContainer.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ModalProvider } from '../../shared/components/modal/context/ModalContext';
import { TraceabilityContainer } from './TraceabilityContainer';
import { useDataTable } from '../../shared/hooks';

vi.mock('../../shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/hooks')>();
  return {
    ...actual,
    useDataTable: vi.fn(),
    useDataMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('../services/traceability.service', () => ({
  TraceabilityService: {
    getAll: vi.fn(),
    getByLotNumber: vi.fn(),
    downloadPdf: vi.fn(),
  },
}));

describe('TraceabilityContainer - Deep Integration Tests', () => {
  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

  const mockTraceabilityData = {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        production_order: 10,
        generated_at: '12/08/2026 10:00',
        integrity_status: {
          valid: true,
          message: 'Firma digital verificada.',
        },
        integrity_hash: 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678',
        content: {
          order_details: {
            id: 10,
            lot_number: 'L26-001',
            wine_name: 'Ontalba Tempranillo',
            production_date: '2026-08-12',
            quantity_produced: 2500,
            bulk_liters_withdrawn: '1875.000',
            total_liters: '1875.000',
            loss_liters: '0.000',
            loss_percentage: 0,
            responsible_user: 'enologo_master',
          },
          recipe_materials: [],
          enological_treatments: [],
          confirmation_timestamp: '2026-08-12T10:00:00Z',
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

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
            <TraceabilityContainer />
          </ModalProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it('1. Debe mostrar el placeholder de carga de trazabilidad', () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      filters: { search: '', page: '1' },
      updateFilters: vi.fn(),
    } as any);

    renderContainer();
    expect(screen.getByText(/Verificando firmas de integridad SHA-256.../i)).toBeInTheDocument();
  });

  it('2. Debe rendirezar la tabla con el número de lote, el vino y el estado de firma verificado', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: mockTraceabilityData,
      isLoading: false,
      isError: false,
      filters: { search: '', page: '1' },
      updateFilters: vi.fn(),
    } as any);

    renderContainer();

    await waitFor(() => {
      expect(screen.queryByText(/Verificando firmas de integridad SHA-256.../i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('L26-001')).toBeInTheDocument();
    expect(screen.getByText('Ontalba Tempranillo')).toBeInTheDocument();
    expect(screen.getByText('🔒 Íntegro (Verificado)')).toBeInTheDocument();
  });

  it('3. Debe renderizar la UI de error en caso de fallo del servidor', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      filters: { search: '', page: '1' },
      updateFilters: vi.fn(),
    } as any);

    renderContainer();

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar los expedientes de trazabilidad/i)).toBeInTheDocument();
    });
  });
});