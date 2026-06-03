import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PurchaseContainer } from './purchase.container';

// 1. Importaciones modulares completas para interceptar con los Spies de Vitest
import * as sharedHooks from '../../shared/hooks';
import * as modalContext from '../../shared/components/modal/context/ModalContext';
import * as tanstackQuery from '@tanstack/react-query';
import { PURCHASE_ORDER_STATUS } from '../models/purchase.schema';

// 2. MOCKS AISLADOS DE INFRAESTRUCTURA Y PORTALES
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: vi.fn() };
});

vi.mock('../../shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/hooks')>();
  return { ...actual, useDataTable: vi.fn(), useDataMutation: vi.fn() };
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

vi.mock('../services/purchase.service', () => ({
  PurchaseService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    clone: vi.fn(),
  },
}));

vi.mock('../../supplier/services/supplier.service', () => ({
  SupplierService: {
    getAll: vi.fn(),
  },
}));

// Desactivamos el formulario transaccional interno para aislar el flujo del contenedor
vi.mock('./forms/purchase.create', () => ({
  PurchaseForm: () => <div data-testid="mock-purchase-form">Formulario de Compras Activo</div>,
}));

describe('PurchaseContainer - Integration & Structural Tests', () => {
  const mockOpenModal = vi.fn();
  const mockCloseModal = vi.fn();
  const mockUpdateFilters = vi.fn();
  const mockMutate = vi.fn();

  // Histórico transaccional simulado
  const mockOrdersListData = {
    count: 1,
    results: [
      {
        id: 50,
        order_number: 'PO-2026-0050',
        supplier: 3,
        supplier_name: 'Bodegas Ontalba Distribución',
        status: PURCHASE_ORDER_STATUS.DRAFT,
        date_issued: '2026-06-02T12:00:00Z',
        date_delivery_expected: '2026-06-15',
        notes: 'Pedido inicial',
        items: [{ id: 1, quantity_ordered: 1000, unit_price: '0.2500' }]
      },
    ],
  };

  const mockSuppliersFilterData = {
    results: [{ id: 3, name: 'Bodegas Ontalba Distribución' }]
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

    // 🔄 RELEVO DE HOOK MULTI-LLAVE: Condicionamos el mock según la clave solicitada
    vi.spyOn(sharedHooks, 'useDataTable').mockImplementation((config: any) => {
      if (config.key === 'purchase-orders-inventory') {
        return {
          data: mockOrdersListData,
          isLoading: false,
          isError: false,
          filters: { search: '', status: '', supplier: '', page: '1' },
          updateFilters: mockUpdateFilters,
        } as any;
      }
      if (config.key === 'suppliers-filter-list') {
        return { data: mockSuppliersFilterData, isLoading: false, isError: false } as any;
      }
      return { data: { results: [] }, isLoading: false, isError: false } as any;
    });

    vi.spyOn(sharedHooks, 'useDataMutation').mockReturnValue(defaultMutationMock as any);
    vi.spyOn(modalContext, 'useModal').mockReturnValue(defaultModalMock as any);
    vi.spyOn(tanstackQuery, 'useQuery').mockReturnValue({ data: undefined, isLoading: false } as any);
  });

  // ===================================================
  // 🟢 ESCENARIOS DE COMPORTAMIENTO E INTEGRACIÓN
  // ===================================================

  it('1. Debe renderizar el título del módulo de compras, las alertas de estado y los registros de la tabla', () => {
    render(<PurchaseContainer />);
    
    // 1. El título de la pantalla sigue igual (es único)
    expect(screen.getByRole('heading', { name: /Órdenes de Compra/i })).toBeInTheDocument();
    
    // 2. El código del pedido sigue igual (es único)
    expect(screen.getByText('PO-2026-0050')).toBeInTheDocument();
    
    // 🟢 CORRECCIÓN PARA EL PROVEEDOR:
    // En lugar de buscar en todo el DOM, buscamos el elemento que tiene rol de celda de tabla (gridcell o cell)
    // o simplemente usamos getAllByText y aseguramos que al menos uno exista.
    const supplierCells = screen.getAllByText('Bodegas Ontalba Distribución');
    expect(supplierCells.length).toBeGreaterThanOrEqual(1);

    // 🟢 CORRECCIÓN PARA EL ESTADO (BORRADOR):
    // Usamos getAllByText para evitar la colisión entre el <option> del filtro y el <span> del badge
    const statusBadges = screen.getAllByText('Borrador');
    expect(statusBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('2. Debe capturar la búsqueda por número de pedido y despachar la actualización a la API', async () => {
    render(<PurchaseContainer />);

    const searchInput = screen.getByPlaceholderText(/Nº de orden o proveedor\.\.\./i);
    fireEvent.change(searchInput, { target: { name: 'search', value: 'PO-2026' } });

    await waitFor(() => {
      expect(mockUpdateFilters).toHaveBeenCalledWith({ search: 'PO-2026', page: 1 });
    });
  });

  it('3. Debe disparar la acción create en el portal de modales al pulsar el botón superior', () => {
    render(<PurchaseContainer />);
    
    const emitBtn = screen.getByRole('button', { name: /Emitir Pedido/i });
    fireEvent.click(emitBtn);
    
    expect(mockOpenModal).toHaveBeenCalledWith('create');
  });

  it('4. Debe renderizar el título semántico correcto cuando se activa la clonación del CloneMixin', () => {
    vi.spyOn(modalContext, 'useModal').mockReturnValue({
      ...defaultModalMock,
      activeAction: 'clone',
      activeId: '50',
    });

    render(<PurchaseContainer />);
    
    expect(screen.getByText('Clonación de Pedido Recurrente')).toBeInTheDocument();
  });

  it('5. Debe gatillar useQuery para pre-cargar la clonación y pintar el placeholder de descarga', () => {
    vi.spyOn(modalContext, 'useModal').mockReturnValue({
      ...defaultModalMock,
      activeAction: 'clone',
      activeId: '50',
    });
    
    vi.spyOn(tanstackQuery, 'useQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<PurchaseContainer />);
    
    expect(screen.getByText(/Extrayendo plantilla de compras recurrente\.\.\./i)).toBeInTheDocument();
  });

  // ===================================================
  // 🔒 ESCENARIOS DE RESTRICCIONES DE NEGOCIO (BODEGA)
  // ===================================================

  it('6. Edge Case - No debe renderizar botones de edición si el pedido tiene estado CLOSED', () => {
    // Simulamos que la consulta del inventario devuelve una orden cerrada e inmutable
    vi.spyOn(sharedHooks, 'useDataTable').mockImplementation((config: any) => {
      if (config.key === 'purchase-orders-inventory') {
        return {
          data: {
            count: 1,
            results: [{ ...mockOrdersListData.results[0], status: PURCHASE_ORDER_STATUS.CLOSED }]
          },
          isLoading: false,
          isError: false,
          filters: { search: '', status: '', supplier: '', page: '1' },
          updateFilters: mockUpdateFilters,
        } as any;
      }
      return { data: mockSuppliersFilterData } as any;
    });

    render(<PurchaseContainer />);

    // Verificamos que el botón de acciones de la tabla no enlaza la mutación de edición
    const editBtn = screen.queryByRole('button', { name: /Editar/i });
    
    // Al pasar un callback vacío en lugar de openModal('edit'), el control queda blindado
    expect(editBtn).not.toBeInTheDocument();
  })});