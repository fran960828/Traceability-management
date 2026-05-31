import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WineContainer } from './wines.container';

// 1. Importamos las dependencias como módulos completos para poder inyectar los Spies de Vitest
import * as sharedHooks from '../../shared/hooks';
import * as modalContext from '../../shared/components/modal/context/ModalContext';
import * as tanstackQuery from '@tanstack/react-query';

// 2. MOCKS PARCIALES Y COMPONENTES AISLADOS (Evitamos problemas de Hoisting)
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

vi.mock('../../shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/hooks')>();
  return {
    ...actual,
    useDataTable: vi.fn(),
    useDataMutation: vi.fn(),
  };
});

vi.mock('../../shared/components/modal/Modal', () => ({
  Modal: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="mock-portal-modal">
      {title && <h2>{title}</h2>}
      {children}
    </div>
  ),
}));

vi.mock('../../shared/components/modal/context/ModalContext', () => ({
  useModal: vi.fn(),
}));

vi.mock('../services/wine.service', () => ({
  WineService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    clone: vi.fn(),
  },
}));

// Desactivamos el formulario interno para evitar ruidos con las llamadas concurrentes en el orquestador
vi.mock('./forms/wine.create', () => ({
  WineForm: () => <div data-testid="mock-wine-form">Formulario de Vinos Activo</div>,
}));

describe('WineContainer - Integration & Structural Tests', () => {
  const mockOpenModal = vi.fn();
  const mockCloseModal = vi.fn();
  const mockUpdateFilters = vi.fn();
  const mockMutate = vi.fn();

  // Payload simulado del catálogo de fichas técnicas de vino
  const mockWinesListData = {
    count: 1,
    results: [
      {
        id: 99,
        internal_code: 'WN-2026-099',
        name: 'ONTALBA COLECCIÓN PRIVADA',
        vintage: 2026,
        wine_type_display: 'TINTO',
        aging_category_display: 'CRIANZA',
        alcohol_percentage: '14.50',
        is_active: true,
      },
    ],
  };

  const defaultTableMock = {
    data: mockWinesListData,
    isLoading: false,
    isError: false,
    filters: { search: '', wine_type: '', vintage: '', page: '1' },
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

    // Inyectamos de forma limpia los comportamientos por defecto mediante Spies
    vi.spyOn(sharedHooks, 'useDataTable').mockReturnValue(defaultTableMock as any);
    vi.spyOn(sharedHooks, 'useDataMutation').mockReturnValue(defaultMutationMock as any);
    vi.spyOn(modalContext, 'useModal').mockReturnValue(defaultModalMock as any);
    
    // El borrador de clonación arranca en reposo
    vi.spyOn(tanstackQuery, 'useQuery').mockReturnValue({ data: undefined, isLoading: false } as any);
  });

  // ===================================================
  // 🟢 ESCENARIOS DE COMPORTAMIENTO E INTEGRACIÓN
  // ===================================================

  it('1. Debe renderizar la cabecera del módulo, los selectores analíticos y los códigos WN de la tabla', () => {
    render(<WineContainer />);
    
    expect(screen.getByRole('heading', { name: /Fichas Técnicas de Vinos/i })).toBeInTheDocument();
    expect(screen.getByText('WN-2026-099')).toBeInTheDocument();
    expect(screen.getByText('ONTALBA COLECCIÓN PRIVADA')).toBeInTheDocument();
  });

  it('2. Debe interceptar la entrada de datos en la barra de búsqueda y despachar los filtros reiniciando la página', async () => {
    render(<WineContainer />);

    const searchInput = screen.getByPlaceholderText(/Nombre, código o D.O\.\.\./i);
    
    fireEvent.change(searchInput, { target: { name: 'search', value: 'Colección' } });

    await waitFor(() => {
      expect(mockUpdateFilters).toHaveBeenCalledWith({ search: 'Colección', page: 1 });
    });
  });

  it('3. Debe capturar el click en el botón superior y disparar la acción create en el portal de modales', () => {
    render(<WineContainer />);
    
    const addBtn = screen.getByRole('button', { name: /Registrar Vino/i });
    fireEvent.click(addBtn);
    
    expect(mockOpenModal).toHaveBeenCalledWith('create');
  });

  it('4. Debe inyectar el título semántico correcto en la cabecera cuando el modal conmuta a edit', () => {
    vi.spyOn(modalContext, 'useModal').mockReturnValue({
      ...defaultModalMock,
      activeAction: 'edit',
      activeId: '99',
    });

    render(<WineContainer />);
    
    expect(screen.getByText('Modificar Ficha Técnica')).toBeInTheDocument();
  });

  it('5. Debe gatillar useQuery para pre-cargar los datos limpios del CloneMixin y pintar el placeholder de espera', () => {
    // Activamos la acción especial de relevo de añada
    vi.spyOn(modalContext, 'useModal').mockReturnValue({
      ...defaultModalMock,
      activeAction: 'clone',
      activeId: '99',
    });
    
    // Simulamos que TanStack Query está descargando el borrador del backend
    vi.spyOn(tanstackQuery, 'useQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<WineContainer />);
    
    expect(screen.getByText(/Preparando borrador de clonación de añada\.\.\./i)).toBeInTheDocument();
  });
});