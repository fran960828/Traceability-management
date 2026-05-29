import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnologicalContainer } from './Enological.container';

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

vi.mock('../../services/enological.service', () => ({
  EnologicalService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Aislamos el formulario específico de laboratorio para evitar ruido de renderizado en el orquestador
vi.mock('../forms/EnologicalForm', () => ({
  EnologicalForm: () => <div data-testid="mock-enological-form">Formulario de Enológicos Activo</div>,
}));

describe('EnologicalContainer - Integration & Structural Tests', () => {
  const mockOpenModal = vi.fn();
  const mockCloseModal = vi.fn();
  const mockUpdateFilters = vi.fn();
  const mockMutate = vi.fn();

  // Payload simulado de la lista de productos enológicos del laboratorio
  const mockEnologicalListData = {
    count: 1,
    results: [
      {
        id: 99,
        internal_code: 'ENO-2026-099',
        name: 'Metabisulfito Potásico Extra',
        enological_type: 'CONSERVANTE',
        enological_type_display: 'Conservantes (Sulfitos/Ascórbico)',
        commercial_format: 'SACO 25KG',
        current_stock: '350.00',
        min_stock_level: '100.00',
        unit_mesure_display: 'Kilos',
        is_low_stock: false,
        is_active: true,
      },
    ],
  };

  const defaultTableMock = {
    data: mockEnologicalListData,
    isLoading: false,
    isError: false,
    filters: { search: '', enological_type: '', page: '1' },
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

  it('1. Debe renderizar la cabecera del módulo, selectores y rellenar las celdas de la tabla con datos de laboratorio', () => {
    render(<EnologicalContainer />);
    
    expect(screen.getByRole('heading', { name: /Productos Enológicos/i })).toBeInTheDocument();
    expect(screen.getByText('ENO-2026-099')).toBeInTheDocument();
    expect(screen.getByText('Metabisulfito Potásico Extra')).toBeInTheDocument();
    expect(screen.getByText('SACO 25KG')).toBeInTheDocument();
  });

  it('2. Debe interceptar la entrada en la barra de búsqueda y despachar los nuevos filtros reiniciando la página', async () => {
    render(<EnologicalContainer />);

    const searchInput = screen.getByPlaceholderText(/Nombre o código ENO\.\.\./i);
    
    // Simulamos la entrada en la barra de búsqueda por parte del enólogo
    fireEvent.change(searchInput, { target: { name: 'search', value: 'Metabisulfito' } });

    // Verificamos que el handler inyecta el criterio y resetea la página a 1 de forma coordinada
    await waitFor(() => {
      expect(mockUpdateFilters).toHaveBeenCalledWith({ search: 'Metabisulfito', page: 1 });
    });
  });

  it('3. Debe capturar el click del botón superior y disparar la acción create en el gestor de modales', () => {
    render(<EnologicalContainer />);
    
    const addBtn = screen.getByRole('button', { name: /Añadir Producto/i });
    fireEvent.click(addBtn);
    
    expect(mockOpenModal).toHaveBeenCalledWith('create');
  });

  it('4. Debe mutar semánticamente el encabezado del Modal cuando el activeAction del contexto dicta una edición', () => {
    // Simulamos la apertura de la ventana en modo edición para la instancia 99
    vi.spyOn(modalContext, 'useModal').mockReturnValue({
      ...defaultModalMock,
      activeAction: 'edit',
      activeId: '99',
    });

    render(<EnologicalContainer />);
    
    // Verificamos que la función de mapeo estático getModalTitle() inyecta el string correcto
    expect(screen.getByText('Modificar Propiedades')).toBeInTheDocument();
  });
});