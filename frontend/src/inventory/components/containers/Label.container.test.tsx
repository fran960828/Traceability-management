import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LabelContainer } from './Label.container';

// 1. Importamos las dependencias como módulos completos para poder meter el espía (Spy)
import * as sharedHooks from '../../../shared/hooks';
import * as modalContext from '../../../shared/components/modal/context/ModalContext';
import * as tanstackQuery from '@tanstack/react-query';


// 2. MOCK PARCIAL BLINDADO: Conserva QueryClient real y solo prepara useQuery para ser espidado
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

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

vi.mock('../../services/label.service', () => ({
  LabelService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    clone: vi.fn(),
  },
}));

// Desactivamos los subcomponentes internos para aislar el comportamiento del orquestador
vi.mock('../forms/LabelForm', () => ({
  LabelForm: () => <div data-testid="mock-label-form">Formulario de Registro Activo</div>,
}));

describe('LabelContainer - Integration Tests', () => {
  const mockOpenModal = vi.fn();
  const mockCloseModal = vi.fn();
  const mockUpdateFilters = vi.fn();
  const mockMutate = vi.fn();

  // 🛡️ Trasladamos la variable DENTRO de la suite para evitar problemas de Hoisting en Vitest
  const mockLabelsListData = {
    count: 1,
    results: [
      {
        id: 77,
        internal_code: 'LBL-77-2026',
        name: 'Etiqueta Frontal Crianza',
        brand_reference: 'Ontalba Tempranillo',
        vintage: 2026,
        label_type_display: 'Frontal',
        current_stock: '5000.00',
        unit_mesure_display: 'Unidades',
        is_low_stock: false,
        is_active: true,
      },
    ],
  };

  const defaultTableMock = {
    data: mockLabelsListData,
    isLoading: false,
    isError: false,
    filters: { search: '', label_type: '', vintage: '', page: '1' },
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

    // Inyectamos las respuestas base estables mediante Spies limpios
    vi.spyOn(sharedHooks, 'useDataTable').mockReturnValue(defaultTableMock as any);
    vi.spyOn(sharedHooks, 'useDataMutation').mockReturnValue(defaultMutationMock as any);
    vi.spyOn(modalContext, 'useModal').mockReturnValue(defaultModalMock as any);
    
    // Espiamos useQuery sobre el módulo parcial clonado de TanStack
    vi.spyOn(tanstackQuery, 'useQuery').mockReturnValue({ data: undefined, isLoading: false } as any);
  });

  // ==========================================
  // 🟢 LOS 5 TESTS SIGUEN IGUAL ABAJO...
  // ==========================================
  it('1. Debe renderizar la tabla con los registros de inventario y los selectores de filtrado', () => {
    render(<LabelContainer />);
    expect(screen.getByRole('heading', { name: /Catálogo de Etiquetas/i })).toBeInTheDocument();
    expect(screen.getByText('LBL-77-2026')).toBeInTheDocument();
  });

 it('2. Debe invocar el cambio de filtros al interactuar con la barra de búsqueda', async () => {
    render(<LabelContainer />);

    const searchInput = screen.getByPlaceholderText(/Nombre, código o marca\.\.\./i);
    
    // Disparamos el cambio simulando la entrada de datos del usuario
    fireEvent.change(searchInput, { target: { name: 'search', value: 'Reserva' } });

    // 🔄 SOLUCIÓN: Esperamos de forma asíncrona a que el debounce o el manejador disparen el Hook
    await waitFor(() => {
      expect(mockUpdateFilters).toHaveBeenCalledWith({ search: 'Reserva', page:1 });
    });
  });

  it('3. Debe abrir el modal en modo creación al pulsar el botón superior', () => {
    render(<LabelContainer />);
    const addBtn = screen.getByRole('button', { name: /Añadir Material/i });
    fireEvent.click(addBtn);
    expect(mockOpenModal).toHaveBeenCalledWith('create');
  });

  it('4. Debe inyectar el título semántico correcto cuando la URL dicta una acción de edición', () => {
    vi.spyOn(modalContext, 'useModal').mockReturnValue({
      ...defaultModalMock,
      activeAction: 'edit',
      activeId: '77',
    });
    render(<LabelContainer />);
    expect(screen.getByText('Modificar Propiedades')).toBeInTheDocument();
  });

  it('5. Debe disparar la query asíncrona de pre-llenado y mostrar el cargando al clonar una añada', () => {
    vi.spyOn(modalContext, 'useModal').mockReturnValue({
      ...defaultModalMock,
      activeAction: 'clone',
      activeId: '77',
    });
    vi.spyOn(tanstackQuery, 'useQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<LabelContainer />);
    expect(screen.getByText(/Preparando borrador de clonación\.\.\./i)).toBeInTheDocument();
  });
});