// src/modules/inventory/pages/__tests__/LocationsPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom'; 
import { ModalProvider } from '../../shared/components/modal/context/ModalContext';
import { LocationsContainer } from './Location.container';
import { useDataTable } from '../../shared/hooks';

// Mockeamos de forma aislada los hooks maestros del core compartido
vi.mock('../../shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/hooks')>();
  return {
    ...actual,
    useDataTable: vi.fn(),
    useDataMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('../services/location.service', () => ({
  LocationService: { 
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
}));

describe('LocationsContainer - Deep Integration Tests', () => {
  const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Estructura de simulación idéntica a la que devuelve Django
  const mockLocationsData = {
    count: 1,
    results: [
      {
        id: 1,
        name: 'ALMACEN_GENERAL',
        description: 'Nave de materias primas y vidrios',
        is_active: true,
        created_at: '2026-06-09T12:00:00Z'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Inyección controlada del nodo raíz para portales de modales en el DOM de Testing
    if (!document.getElementById('modal-root')) {
      const modalRoot = document.createElement('div');
      modalRoot.setAttribute('id', 'modal-root');
      document.body.appendChild(modalRoot);
    }
  });

  // RENDERIZADOR COMPLETO CON CONTEXTOS BODEGUEROS AISLADOS
  const renderContainer = () => {
    const queryClient = createTestQueryClient();
    return render(
      <MemoryRouter initialEntries={['/']}>
        <QueryClientProvider client={queryClient}>
          <ModalProvider>
            <LocationsContainer />
          </ModalProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  // ===================================================
  // 🟢 COMPORTAMIENTOS DINÁMICOS Y FLUJOS DE INTERFAZ
  // ===================================================

  it('1. Debe mostrar el bloque de carga mientras se recuperan los registros de stock de la DB', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      filters: { search: '', page: '1' },
      updateFilters: vi.fn(),
    } as any);

    renderContainer();
    await waitFor(() => {
      expect(screen.queryByText(/Cargando registros estructurales de stock\.\.\./i)).toBeInTheDocument();
    });
  });

  it('2. Debe renderizar las cabeceras analíticas de control y las tuplas mapeadas desde Django', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: mockLocationsData,
      isLoading: false,
      isError: false,
      filters: { search: '', page: '1' },
      updateFilters: vi.fn(),
    } as any);

    renderContainer();

    // Esperamos asíncronamente a que se purgue el estado de carga inicial
    await waitFor(() => {
      expect(screen.queryByText(/Cargando registros estructurales de stock\.\.\./i)).not.toBeInTheDocument();
    });

    // Validamos la estructura inyectada en GenericTable
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Código de Ubicación')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();

    // Validamos los datos reales del registro
    expect(screen.getByText('ALMACEN_GENERAL')).toBeInTheDocument();
    expect(screen.getByText('Nave de materias primas y vidrios')).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument(); // Badge del render de constantes
  });

  it('3. Debe pintar el estado vacío amigable si el recuento de la API viene a cero', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: { count: 0, results: [] },
      isLoading: false,
      isError: false,
      filters: { search: '', page: '1' },
      updateFilters: vi.fn(),
    } as any); 

    renderContainer();

    await waitFor(() => {
      expect(screen.getByText('No se han encontrado zonas de almacenamiento registradas en el sistema.')).toBeInTheDocument();
    });
  });

  it('4. Debe abrir el portal modal de creación con el título e iconografía correctos al pulsar el botón superior', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: mockLocationsData,
      isLoading: false,
      isError: false,
      filters: { search: '', page: '1' },
      updateFilters: vi.fn(),
    } as any);

    renderContainer();

    // Accionamos el botón primario de registro espacial
    const registerBtn = screen.getByRole('button', { name: /Registrar Ubicación/i });
    fireEvent.click(registerBtn);

    // Certificamos la conmutación del modal a través de useModal context
    expect(await screen.findByRole('heading', { name: 'Establecer Nueva Ubicación' })).toBeInTheDocument();
  });

  it('5. Debe renderizar el bloque de error ante fallas de conectividad con DRF', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true, 
      filters: { search: '', page: '1' },
      updateFilters: vi.fn(),
    } as any);

    renderContainer();

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar las zonas de almacenamiento físico de la bodega/i)).toBeInTheDocument();
    });
  });
});