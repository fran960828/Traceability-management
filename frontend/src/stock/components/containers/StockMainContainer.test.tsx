// src/stock/components/containers/StockMainContainer.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ModalProvider } from '../../../shared/components/modal/context/ModalContext';
import { StockMainContainer } from './StockMainContainer'; 
import { useDataTable, useDataMutation } from '../../../shared/hooks';
import { MOVEMENT_TYPE } from '../../../reception/models/';

// ==========================================
// 🔄 ISOLATION & MOCKS DEL CORE
// ==========================================
vi.mock('../../../shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/hooks')>();
  return {
    ...actual,
    useDataTable: vi.fn(),
    useDataMutation: vi.fn(),
  };
});

vi.mock('../../services/stock.service', () => ({
  StockService: {
    getAll: vi.fn(),
    transfer: vi.fn(),
    adjustment: vi.fn(),
  },
}));

vi.mock('../../../locations/services/location.service', () => ({
  LocationService: { getAll: vi.fn() },
}));

// Mocks estables de los formularios inyectados en el Portal
vi.mock('../forms/stock.transferForm', () => ({
  StockTransferForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="mock-transfer-form">
      <button onClick={() => onSubmit({ batch: 12, origin_location: 2, destination_location: 5, quantity: 100, notes: 'Test' })}>
        Simular Confirmar Transferencia
      </button>
      <button onClick={onCancel}>Simular Cancelar Transferencia</button>
    </div>
  ),
}));

vi.mock('../forms/stock.adjustmentForm', () => ({
  StockAdjustmentForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="mock-adjustment-form">
      <button onClick={() => onSubmit({ batch: 14, location: 2, quantity: -50, notes: 'Merma Test' })}>
        Simular Confirmar Ajuste
      </button>
      <button onClick={onCancel}>Simular Cancelar Ajuste</button>
    </div>
  ),
}));

describe('StockMainContainer - Deep Integration Tests', () => {
  const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockMovementsResponse = {
    count: 1,
    results: [
      {
        id: 501,
        batch: 12,
        batch_number: 'LOT-2026-A1',
        product_name: 'Botella Bordelesa Elite',
        location: '2',
        location_name: 'CÁMARA_ENOLÓGICA_A',
        quantity: '3000.000',
        movement_type: MOVEMENT_TYPE.IN,
        movement_type_display: 'Entrada (Compra/Recepciones)', 
        reference_po: 42,
        user: 1,
        user_full_name: 'Supervisor Muelle 01',
        created_at: '2026-06-19T10:00:00Z',
        notes: 'Entrada camión'
      }
    ]
  };

  const mockLocationsFilterResponse = {
    results: [
      { id: 2, name: 'CÁMARA_ENOLÓGICA_A', is_active: true },
      { id: 5, name: 'MUELLE_PRINCIPAL', is_active: true }
    ]
  };

  const mockMutate = vi.fn();
  const mockUpdateFilters = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Re-inyección limpia del contenedor de portales antes de cada ejecución
    const oldRoot = document.getElementById('modal-root');
    if (oldRoot) oldRoot.remove();
    
    const modalRoot = document.createElement('div');
    modalRoot.setAttribute('id', 'modal-root');
    document.body.appendChild(modalRoot);

    vi.mocked(useDataMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any);

    vi.mocked(useDataTable).mockImplementation(({ key }: any) => {
      if (key === 'stock-movements-history') {
        return {
          data: mockMovementsResponse,
          isLoading: false,
          isError: false,
          filters: { search: '', movement_type: '', location: '', page: '1' },
          updateFilters: mockUpdateFilters,
        } as any;
      }
      return {
        data: mockLocationsFilterResponse,
        isLoading: false,
      } as any;
    });
  });

  // 🟢 MEJORA DE RENDERIZADO: Hidratamos la URL con los Query Params nativos del test de forma explícita
  const renderContainer = (initialTab = 'history') => {
    const queryClient = createTestQueryClient();
    return render(
      <MemoryRouter initialEntries={[`/inventory/stock?tab=${initialTab}`]}>
        <QueryClientProvider client={queryClient}>
          <ModalProvider>
            <StockMainContainer />
          </ModalProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it('1. Debe renderizar las dos pestañas corporativas', () => {
    renderContainer('history');
    expect(screen.getByRole('button', { name: /Libro Diario de Movimientos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Existencias y Lotes Disponibles/i })).toBeInTheDocument();
  });

  it('2. Pestaña Libro Diario - Debe listar el histórico con la acción exclusiva de Ver Detalle', () => {
    renderContainer('history');
    expect(screen.getByText('LOT-2026-A1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver Detalle/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Trasladar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Merma/i })).not.toBeInTheDocument();
  });

  it('3. Pestaña Existencias - Debe conmutar la pestaña, ocultar Ver Detalle y desplegar botones operativos', () => {
    renderContainer('inventory');
    expect(screen.getByText('Botella Bordelesa Elite')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trasladar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Merma/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver Detalle/i })).not.toBeInTheDocument();
  });

  it('4. Detalle - Debe desplegar la ficha de auditoría inmutable desde el Libro Diario', async () => {
    renderContainer('history');

    const detailBtn = screen.getByRole('button', { name: /Ver Detalle/i });
    fireEvent.click(detailBtn);

    // 🟢 CORRECCIÓN: Buscamos en el DOM de manera elástica esperando la propagación al portal raíz
    await waitFor(() => {
      const modalPortalNode = document.getElementById('modal-root');
      expect(modalPortalNode?.innerHTML).toContain('Ficha Técnica de Auditoría');
      expect(modalPortalNode?.innerHTML).toContain('Entrada camión');
    });
  });

  it('5. Flujos Transaccionales - Debe despachar las mutaciones atómicas desde la pestaña de existencias disponibles', async () => {
    renderContainer('inventory');

    // A. Provocar apertura y envío de Transferencias
    const transferBtn = screen.getByRole('button', { name: /Trasladar/i });
    fireEvent.click(transferBtn);
    
    await waitFor(() => {
      expect(screen.getByTestId('mock-transfer-form')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Simular Confirmar Transferencia' }));

    // B. Provocar apertura y envío de Mermas/Ajustes
    const adjustmentBtn = screen.getByRole('button', { name: /Merma/i });
    fireEvent.click(adjustmentBtn);
    
    await waitFor(() => {
      expect(screen.getByTestId('mock-adjustment-form')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Simular Confirmar Ajuste' }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(2);
    });
  });

  it('6. Robustez - Debe pintar la advertencia si el backend de Django devuelve un código de error', async () => {
    vi.mocked(useDataTable).mockImplementation(({ key }: any) => {
      if (key === 'stock-movements-history') {
        return {
          data: undefined,
          isLoading: false,
          isError: true,
          filters: {},
          updateFilters: vi.fn(),
        } as any;
      }
      return { data: undefined, isLoading: false } as any;
    });

    renderContainer('history');
    await waitFor(() => {
      expect(screen.getByText(/Error crítico de auditoría al recuperar los datos de existencias/i)).toBeInTheDocument();
    });
  });
});