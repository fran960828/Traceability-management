import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom'; // 🔄 CORRECCIÓN: Evita contaminación de URL entre pruebas
import { ModalProvider } from '../../shared/components/modal/context/ModalContext';
import { SuppliersContainer } from './Supplier.container';
import { CategoryService } from '../services';
import { useDataTable } from '../../shared/hooks';

// Mockeamos las dependencias de hooks y servicios de datos de la bodega
vi.mock('../../shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/hooks')>();
  return {
    ...actual,
    useDataTable: vi.fn(),
    useDataMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('../services', () => ({
  CategoryService: { 
    getCategories: vi.fn() 
  },
  SupplierService: { 
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
}));

describe('SuppliersContainer - Deep Integration Tests', () => {
  const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockSuppliersData = {
    count: 1,
    results: [
      {
        id: 1,
        supplier_code: 'PROV-2026-001',
        name: 'Bodegas Ontalba Test',
        tax_id: 'B12345678',
        category: 1,
        category_name: 'ENOLOGICAL',
        email_pedidos: 'compras@ontalba.com',
        phone: '600112233',
        address: 'Calle Bodega 10',
        lead_time: 5,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Configuramos el contenedor del portal en el DOM de pruebas
    if (!document.getElementById('modal-root')) {
      const modalRoot = document.createElement('div');
      modalRoot.setAttribute('id', 'modal-root');
      document.body.appendChild(modalRoot);
    }

    vi.spyOn(CategoryService, 'getCategories').mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
  });

  // 🔄 RENDERIZADOR OPTIMIZADO: Asegura una URL limpia por cada it()
  const renderContainer = () => {
    const queryClient = createTestQueryClient();
    return render(
      <MemoryRouter initialEntries={['/']}>
        <QueryClientProvider client={queryClient}>
          <ModalProvider>
            <SuppliersContainer />
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
      filters: { search: '', category: '', page: '1' }, // 🔄 Cambiado a string
      updateFilters: vi.fn(),
    } as any);

    renderContainer();
    expect(screen.getByText(/Cargando registros de proveedores.../i)).toBeInTheDocument();
  });

  it('2. Debe renderizar las cabeceras y los datos del proveedor si la API responde con éxito', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: mockSuppliersData,
      isLoading: false,
      isError: false,
      filters: { search: '', category: '', page: '1' }, // 🔄 Cambiado a string
      updateFilters: vi.fn(),
    } as any);

    renderContainer();

    // 🔄 CORRECCIÓN ASÍNCRONA: Damos tiempo a que se limpie el placeholder de carga
    await waitFor(() => {
      expect(screen.queryByText(/Cargando registros de proveedores.../i)).not.toBeInTheDocument();
    });

    // Validamos cabeceras críticas de la GenericTable
    expect(screen.getByText('Código')).toBeInTheDocument();
    expect(screen.getByText('NIF/CIF')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();

    // Validamos los datos de la primera fila
    expect(screen.getByText('PROV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Bodegas Ontalba Test')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('3. Debe pintar el estado vacío si la lista de resultados de Django viene a cero', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: { count: 0, results: [] },
      isLoading: false,
      isError: false,
      filters: { search: '', category: '', page: '1' }, // 🔄 Cambiado a string
      updateFilters: vi.fn(),
    } as any); 

    renderContainer();

    // 🔄 CORRECCIÓN ASÍNCRONA: Esperamos a que el render detecte el array vacío
    await waitFor(() => {
      expect(screen.getByText(/No se han encontrado proveedores con los criterios seleccionados/i)).toBeInTheDocument();
    });
  });

  it('4. Debe levantar el portal modal de creación al accionar el botón superior', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: mockSuppliersData,
      isLoading: false,
      isError: false,
      filters: { search: '', category: '', page: '1' }, // 🔄 Cambiado a string
      updateFilters: vi.fn(),
    } as any);

    renderContainer();

    const createBtn = screen.getByRole('button', { name: /Añadir Proveedor/i });
    fireEvent.click(createBtn);

    expect(await screen.findByRole('heading', { name: 'Registrar Proveedor' })).toBeInTheDocument();
  });

  it('5. Debe renderizar la UI de error si falla la comunicación con el servidor', async () => {
    vi.mocked(useDataTable).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true, 
      filters: { search: '', category: '', page: '1' }, // 🔄 Cambiado a string
      updateFilters: vi.fn(),
    } as any);

    renderContainer();

    // 🔄 CORRECCIÓN ASÍNCRONA: Esperamos a que se pinte el bloque condicional de isError
    await waitFor(() => {
      expect(screen.getByText(/Error al cargar los proveedores de la bodega/i)).toBeInTheDocument();
    });
  });
});