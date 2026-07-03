import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StockMainContainer } from './StockMainContainer';
import { useModal } from '../../../shared/components/modal/context/ModalContext';
import { useDataTable } from '../../../shared/hooks';

// 🔹 Mockear Hooks de Navegación y Modales
const mockSetSearchParams = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

vi.mock('../../../shared/hooks', () => ({
  useDataTable: vi.fn(),
  useDataMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../../../shared/components/modal/context/ModalContext', () => ({
  useModal: vi.fn(),
}));

// Mocks de servicios base
const mockMovements = [
  {
    id: 101,
    batch: 1,
    batch_number: 'LOT-2026-A1',
    product_name: 'Botella Bordelesa Elite',
    location_name: 'CÁMARA_ENOLÓGICA_A',
    quantity: '3000.000',
    movement_type_display: 'Entrada (Compra/Recepciones)',
    created_at: '2026-06-19T10:00:00Z',
    user_full_name: 'Supervisor Muelle 01',
  }
];

const mockLocations = {
  results: [
    { id: 2, name: 'CÁMARA_ENOLÓGICA_A', is_active: true },
    { id: 5, name: 'MUELLE_PRINCIPAL', is_active: true }
  ]
};

describe('StockMainContainer - Deep Integration Tests', () => {
  const mockOpenModal = vi.fn();
  const mockCloseModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams({ tab: 'history', page: '1' });
    
    // Configuración por defecto de modales cerrados
    vi.mocked(useModal).mockReturnValue({
      activeAction: null,
      activeId: null,
      openModal: mockOpenModal,
      closeModal: mockCloseModal,
    });

    // Respuesta por defecto del Hook de Datos
    vi.mocked(useDataTable).mockImplementation((config: any) => {
      if (config.key === 'locations-dashboard-filter') {
        return { data: mockLocations, isLoading: false, isError: false, filters: {}, updateFilters: vi.fn() } as any;
      }
      return {
        data: { count: 1, results: mockMovements },
        isLoading: false,
        isError: false,
        filters: { page: '1' },
        updateFilters: vi.fn(),
      } as any;
    });
  });

  it('1. Debe renderizar las dos pestañas corporativas', () => {
    render(<StockMainContainer />);
    expect(screen.getByText(/Libro Diario de Movimientos/i)).toBeInTheDocument();
    expect(screen.getByText(/Existencias y Lotes Disponibles/i)).toBeInTheDocument();
  });

  it('2. Pestaña Libro Diario - Debe listar el histórico con la acción de Ver Detalle', () => {
    render(<StockMainContainer />);
    expect(screen.getByText('Botella Bordelesa Elite')).toBeInTheDocument();
    expect(screen.getByText('LOT-2026-A1')).toBeInTheDocument();
    expect(screen.getByText('Ver Detalle')).toBeInTheDocument();
  });

  it('3. Pestaña Existencias - Debe conmutar la pestaña al hacer click', () => {
    render(<StockMainContainer />);
    const inventoryTabBtn = screen.getByText(/Existencias y Lotes Disponibles/i);
    
    fireEvent.click(inventoryTabBtn);
    expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'inventory', page: '1' });
  });

  it('4. Robustez - Debe pintar la advertencia si el backend de Django devuelve un código de error', async () => {
    vi.mocked(useDataTable).mockImplementation((config: any) => {
      if (config.key === 'locations-dashboard-filter') {
        return { data: mockLocations, isLoading: false, isError: false, filters: {}, updateFilters: vi.fn() } as any;
      }
      return { data: null, isLoading: false, isError: true, filters: {}, updateFilters: vi.fn() } as any;
    });

    render(<StockMainContainer />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error crítico al recuperar los datos de existencias./i)).toBeInTheDocument();
    });
  });
});