import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ModalProvider } from '../../shared/components/modal/context/ModalContext';
import { StockMovementContainer } from './Stock.container';
import { useDataTable, useDataMutation } from '../../shared/hooks';
import { MOVEMENT_TYPE } from '../../reception/models/';

// ==========================================
// 🔄 ISOLATION & MOCKS DEL CORE
// ==========================================
vi.mock('../../shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/hooks')>();
  return {
    ...actual,
    useDataTable: vi.fn(),
    useDataMutation: vi.fn(),
  };
});

// Mock de servicios de soporte de la app de Stock
vi.mock('../services/stock.service', () => ({
  StockService: {
    getAll: vi.fn(),
    transfer: vi.fn(),
    adjustment: vi.fn(),
  },
}));

vi.mock('../../locations/services/location.service', () => ({
  LocationService: { getAll: vi.fn() },
}));

// Mock de los formularios internos para aislar el test del contenedor puro
vi.mock('./forms/stock.transferForm', () => ({
  StockTransferForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="mock-transfer-form">
      <button onClick={() => onSubmit({ batch: 12, origin_location: 2, destination_location: 5, quantity: 100, notes: 'Test' })}>
        Simular Confirmar Transferencia
      </button>
      <button onClick={onCancel}>Simular Cancelar Transferencia</button>
    </div>
  ),
}));

vi.mock('./forms/stock.adjustmentForm', () => ({
  StockAdjustmentForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="mock-adjustment-form">
      <button onClick={() => onSubmit({ batch: 14, location: 2, quantity: -50, notes: 'Merma Test' })}>
        Simular Confirmar Ajuste
      </button>
      <button onClick={onCancel}>Simular Cancelar Ajuste</button>
    </div>
  ),
}));

describe('StockMovementContainer - Deep Integration Tests', () => {
  const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Histórico transaccional simulado del libro diario
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

    // Inyección obligatoria del nodo raíz para portales en el DOM de pruebas
    if (!document.getElementById('modal-root')) {
      const modalRoot = document.createElement('div');
      modalRoot.setAttribute('id', 'modal-root');
      document.body.appendChild(modalRoot);
    }

    // Comportamiento base del hook de mutación
    vi.mocked(useDataMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any);

    // Implementación robusta de useDataTable siguiendo el espejo de la referencia
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

  // RENDERIZADOR CORPORATIVO CON CONTEXTOS DE BODEGA INSTANCIADOS
  const renderContainer = () => {
    const queryClient = createTestQueryClient();
    return render(
      <MemoryRouter initialEntries={['/']}>
        <QueryClientProvider client={queryClient}>
          <ModalProvider>
            <StockMovementContainer />
          </ModalProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  // ===================================================
  // 🟢 ESCENARIO 1: HAPPY PATH & VISUALIZACIÓN BASE
  // ===================================================
  it('1. Happy Path - Debe renderizar la cabecera, los filtros analíticos y listar los movimientos con sus celdas de auditoría', () => {
    renderContainer();

    expect(screen.getByRole('heading', { name: /Libro Diario de Existencias/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Lote o material...')).toBeInTheDocument();

    // Verificaciones de las tuplas inmutables en la tabla
    expect(screen.getByText('LOT-2026-A1')).toBeInTheDocument();
    expect(screen.getByText('Botella Bordelesa Elite')).toBeInTheDocument();
    expect(screen.getByText('+3000.000')).toBeInTheDocument();
    
    // Evitamos ambigüedad aislando la celda del filtro frente al td de resultados
    expect(screen.getByText('CÁMARA_ENOLÓGICA_A', { selector: 'td' })).toBeInTheDocument();
  });

  // ===================================================
  // 🔵 ESCENARIO 2: COMPORTAMIENTO DINÁMICO DE FILTROS
  // ===================================================
  it('2. Debe gatillar la actualización de query params cuando el operario introduce texto en la barra de búsqueda', async () => {
    renderContainer();

    const searchInput = screen.getByPlaceholderText('Lote o material...');
    
    fireEvent.change(searchInput, { target: { value: 'LOT-2026-A1' } });
    fireEvent.input(searchInput);

    expect(searchInput).toHaveValue('LOT-2026-A1');
    await waitFor(() => {
      expect(mockUpdateFilters).toHaveBeenCalled();
    });
  });

  // ===================================================
  // 🔒 ESCENARIO 3: COMPROBACIÓN DE INMUTABILIDAD EN DETALLE
  // ===================================================
  it('3. Ficha de Detalle - Debe levantar el modal de auditoría en modo lectura omitiendo controles de edición', async () => {
    renderContainer();

    const detailBtn = screen.getByRole('button', { name: 'Ver Auditoría' });
    fireEvent.click(detailBtn);

    // Certificamos la inyección dinámica del título sin puntos finales conflictivos
    expect(await screen.findByRole('heading', { name: 'Ficha Técnica de Auditoría de Movimiento' })).toBeInTheDocument();
    expect(screen.getByText('Entrada camión')).toBeInTheDocument();

    // Verificación estricta de trazabilidad alimentaria: No existen botones de modificación ni borrado
    expect(screen.queryByRole('button', { name: /Editar Datos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar Ficha/i })).not.toBeInTheDocument();
  });

  // ===================================================
  // 🚀 ESCENARIO 4: FLUJO TRANSACCIONAL - TRANSFERENCIAS
  // ===================================================
  it('4. Flujo Transferencia - Debe levantar el modal de traslado, cargar el formulario y despachar la mutación atómica', async () => {
    renderContainer();

    const transferBtn = screen.getByRole('button', { name: /Transferir Existencias/i });
    fireEvent.click(transferBtn);

    expect(await screen.findByRole('heading', { name: 'Registrar Transferencia entre Almacenes' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-transfer-form')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Simular Confirmar Transferencia' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
  });

  // ===================================================
  // 🚀 ESCENARIO 5: FLUJO TRANSACCIONAL - AJUSTES / MERMAS
  // ===================================================
  it('5. Flujo Ajuste - Debe levantar el formulario de mermas y canalizar los datos con éxito hacia el servicio', async () => {
    renderContainer();

    const adjustmentBtn = screen.getByRole('button', { name: /Declarar Merma \/ Ajuste/i });
    fireEvent.click(adjustmentBtn);

    expect(await screen.findByRole('heading', { name: 'Declarar Ajuste Manual / Merma de Insumos' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-adjustment-form')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Simular Confirmar Ajuste' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
  });

  // ===================================================
  // 🔴 ESCENARIO 6: MANEJO DE ROBUSTEZ Y ERRORES DE RED
  // ===================================================
  it('6. Robustez - Debe renderizar la alerta condicional si falla la conexión con Django', async () => {
    vi.mocked(useDataTable).mockImplementation(({ key }: any) => {
      if (key === 'stock-movements-history') {
        return {
          data: undefined,
          isLoading: false,
          isError: true,
          filters: { search: '', movement_type: '', location: '', page: '1' },
          updateFilters: vi.fn(),
        } as any;
      }
      return { data: undefined, isLoading: false } as any;
    });

    renderContainer();

    await waitFor(() => {
      expect(screen.getByText(/Error crítico de auditoría al recuperar el libro diario de movimientos/i)).toBeInTheDocument();
    });
  });
});