import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PackagingContainer } from './Packaging.container';

// 1. Importamos las dependencias como módulos completos para poder inyectar los spies de Vitest
import * as sharedHooks from '../../../shared/hooks';
import * as modalContext from '../../../shared/components/modal/context/ModalContext';

// 2. MOCKS PARCIALES Y COMPONENTES AISLADOS
vi.mock('../../../shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/hooks')>();
  return {
    ...actual,
    useDataTable: vi.fn(),
    useDataMutation: vi.fn(),
  };
});

vi.mock('../../../shared/components/modal/Modal', () => ({
  Modal: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="mock-portal-modal">
      {title && <h2>{title}</h2>}
      {children}
    </div>
  ),
}));

vi.mock('../../../shared/components/modal/context/ModalContext', () => ({
  useModal: vi.fn(),
}));

vi.mock('../../services/packaging.service', () => ({
  PackagingService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Aislamos el formulario específico para evitar ruido de renderizado en el orquestador
vi.mock('../forms/Packaging.create', () => ({
  PackagingForm: () => <div data-testid="mock-packaging-form">Formulario de Packaging Activo</div>,
}));

describe('PackagingContainer - Integration & Structural Tests', () => {
  const mockOpenModal = vi.fn();
  const mockCloseModal = vi.fn();
  const mockUpdateFilters = vi.fn();
  const mockMutate = vi.fn();

  // Payload simulado de la lista de inventario de acondicionamiento
  const mockPackagingListData = {
    count: 1,
    results: [
      {
        id: 88,
        internal_code: 'PAC-2026-088',
        name: 'Botella Vidrio Eco-Bordelesa',
        packaging_type: 'VIDRIO',
        packaging_type_display: 'Vidrio (Botellas)',
        specification: 'BOTELLA 75CL LIGERA',
        color: 'VERDE HOJA',
        capacity: '0.750',
        current_stock: '8500.00',
        unit_mesure_display: 'Unidades',
        is_low_stock: false,
        is_active: true,
      },
    ],
  };

  const defaultTableMock = {
    data: mockPackagingListData,
    isLoading: false,
    isError: false,
    filters: { search: '', packaging_type: '', page: '1' },
    updateFilters: mockUpdateFilters,
  };

  const defaultModalMock = {
    activeAction: null,
    activeId: null,
    openModal: mockOpenModal,
    closeModal: mockCloseModal,
  };

  const defaultMutationMock = {
    mutate: mockMutate,
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Inyectamos las respuestas base estables mediante Spies limpios en el Shared
    vi.spyOn(sharedHooks, 'useDataTable').mockReturnValue(defaultTableMock as any);
    vi.spyOn(sharedHooks, 'useDataMutation').mockReturnValue(defaultMutationMock as any);
    vi.spyOn(modalContext, 'useModal').mockReturnValue(defaultModalMock as any);
  });

  // ==========================================
  // 🟢 PRUEBAS DE CONFIGURACIÓN Y COMPORTAMIENTO
  // ==========================================

  it('1. Debe renderizar la cabecera del módulo, selectores y rellenar las celdas de la tabla', () => {
    render(<PackagingContainer />);
    
    expect(screen.getByRole('heading', { name: /Materiales de Acondicionamiento/i })).toBeInTheDocument();
    expect(screen.getByText('PAC-2026-088')).toBeInTheDocument();
    expect(screen.getByText('Botella Vidrio Eco-Bordelesa')).toBeInTheDocument();
    expect(screen.getByText('BOTELLA 75CL LIGERA')).toBeInTheDocument();
  });

  it('2. Debe interceptar la entrada en la barra de búsqueda y despachar los nuevos filtros', async () => {
    render(<PackagingContainer />);

    const searchInput = screen.getByPlaceholderText(/Nombre o código PAC\.\.\./i);
    
    // Simulamos la interacción del operario de bodega
    fireEvent.change(searchInput, { target: { name: 'search', value: 'Bordelesa' } });

    await waitFor(() => {
      expect(mockUpdateFilters).toHaveBeenCalledWith({ search: 'Bordelesa',page: 1 });
    });
  });

  it('3. Debe capturar el click del botón superior y disparar la acción create en la URL', () => {
    render(<PackagingContainer />);
    
    const addBtn = screen.getByRole('button', { name: /Añadir Material/i });
    fireEvent.click(addBtn);
    
    expect(mockOpenModal).toHaveBeenCalledWith('create');
  });

  it('4. Debe mutar semánticamente el encabezado del Modal cuando el activeAction de la URL cambia a edit', () => {
    // Simulamos que el hook del modal inyecta estados de edición en los query params
    vi.spyOn(modalContext, 'useModal').mockReturnValue({
      ...defaultModalMock,
      activeAction: 'edit',
      activeId: '88',
    });

    render(<PackagingContainer />);
    
    // Verificamos que el mapeador getModalTitle() responde adecuadamente
    expect(screen.getByText('Modificar Propiedades')).toBeInTheDocument();
  });
});