// src/modules/inventory/components/containers/__tests__/ReceptionContainer.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ModalProvider } from '../../shared/components/modal/context/ModalContext';
import { ReceptionContainer } from './Reception.container';
import { useDataTable, useDataMutation } from '../../shared/hooks';
import { PURCHASE_ORDER_STATUS } from '../../purchase/models/purchase.schema';

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

// Mock de los servicios de soporte
vi.mock('../services/reception.service', () => ({
  ReceptionService: { bulkReceive: vi.fn() },
}));
vi.mock('../../purchase/services/purchase.service', () => ({
  PurchaseService: { getAll: vi.fn() },
}));
vi.mock('../../supplier/services/supplier.service', () => ({
  SupplierService: { getAll: vi.fn() },
}));

// Mock del formulario interno para aislar el test del contenedor
vi.mock('./forms/reception.confirm', () => ({
  ReceptionForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="mock-reception-form">
      <button onClick={() => onSubmit({ items: [] })}>Simular Confirmar</button>
      <button onClick={onCancel}>Simular Cancelar</button>
    </div>
  ),
}));

describe('ReceptionContainer - Deep Integration Tests', () => {
  const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Datos simulados de órdenes de compra (Una parcial activa y otra cerrada/bloqueada)
  const mockPurchaseOrdersResponse = {
    count: 2,
    results: [
      {
        id: 101,
        order_number: 'PO-2026-001',
        supplier: 1,
        supplier_name: 'Vidrierías del Norte',
        status: PURCHASE_ORDER_STATUS.PARTIAL,
        date_issued: '2026-06-01T00:00:00Z',
        date_delivery_expected: '2026-06-15',
        items: [{ id: 1, material_name: 'Botellas', quantity_ordered: 1000, quantity_received: 500 }]
      },
      {
        id: 102,
        order_number: 'PO-2026-002',
        supplier: 2,
        supplier_name: 'Corchos Logroño',
        status: PURCHASE_ORDER_STATUS.CLOSED, // 🔒 Caso de borde: Bloqueada
        date_issued: '2026-05-20T00:00:00Z',
        date_delivery_expected: '2026-05-30',
        items: []
      }
    ]
  };

  const mockSuppliersFilterResponse = {
    results: [
      { id: 1, name: 'Vidrierías del Norte' },
      { id: 2, name: 'Corchos Logroño' }
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

    // Implementación robusta por defecto para evitar colapsos por destructuración
    vi.mocked(useDataTable).mockImplementation(({ key }: any) => {
      if (key === 'reception-purchase-orders') {
        return {
          data: mockPurchaseOrdersResponse,
          isLoading: false,
          isError: false,
          filters: { search: '', status: '', supplier: '', page: '1' },
          updateFilters: mockUpdateFilters,
        } as any;
      }
      return {
        data: mockSuppliersFilterResponse,
        isLoading: false,
      } as any;
    });
  });

  // RENDERIZADOR CORPORATIVO CON CONTEXTOS BODEGUEROS AISLADOS
  const renderContainer = () => {
    const queryClient = createTestQueryClient();
    return render(
      <MemoryRouter initialEntries={['/']}>
        <QueryClientProvider client={queryClient}>
          <ModalProvider>
            <ReceptionContainer />
          </ModalProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  // ===================================================
  // 🟢 ESCENARIO 1: HAPPY PATH & VISUALIZACIÓN BASE (CORREGIDO)
  // ===================================================
  it('1. Happy Path - Debe renderizar el muelle de carga, los filtros y listar las órdenes con sus estados correctos', async () => {
    renderContainer();

    // Verificaciones de estructura de la página
    expect(screen.getByRole('heading', { name: /Muelle de Recepción e Inventario/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nº orden o proveedor...')).toBeInTheDocument();

    // Verificaciones de las tuplas de la tabla
    expect(screen.getByText('PO-2026-001')).toBeInTheDocument();
    
    // 🟢 SOLUCIÓN AMBIGÜEDAD: Especificamos que busque el texto dentro de la celda 'td' de la tabla, ignorando el <option> del filtro
    expect(screen.getByText('Vidrierías del Norte', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText('Recibida Parcial', { selector: 'span' })).toBeInTheDocument(); 
  });

  // ===================================================
  // 🟡 ESCENARIO 2: EDGE CASES (BLOQUEOS PREVENTIVOS)
  // ===================================================
  it('2. Edge Case - Debe deshabilitar el botón de acción si la orden ya está archivada o CLOSED', () => {
    renderContainer();

    // La orden PO-2026-001 está PARTIAL -> Botón "Recibir" activo
    const activeBtn = screen.getByRole('button', { name: 'Recibir' });
    expect(activeBtn).not.toBeDisabled();

    // La orden PO-2026-002 está CLOSED -> Botón muta a "Completado" y se bloquea preventivamente
    const disabledBtn = screen.getByRole('button', { name: 'Completado' });
    expect(disabledBtn).toBeDisabled();
  });

  // ===================================================
  // 🔵 ESCENARIO 3: COMPORTAMIENTO DINÁMICO DE FILTROS (CORREGIDO)
  // ===================================================
  it('3. Debe gatillar la actualización de query params cuando el operario introduce texto en la barra de búsqueda', async() => {
    renderContainer();

    const searchInput = screen.getByPlaceholderText('Nº orden o proveedor...');
    
    // 🟢 SOLUCIÓN ACCIÓN: Simulamos tanto el cambio como el input nativo para asegurar la propagación en componentes controlados
    fireEvent.change(searchInput, { target: { value: 'PO-2026-001',page:'1' } });
    fireEvent.input(searchInput);

    expect(searchInput).toHaveValue('PO-2026-001');
    await waitFor(() => {
      expect(mockUpdateFilters).toHaveBeenCalled();
    });
  });

  // ===================================================
  // 🚀 ESCENARIO 4: FLUJO TRANSACCIONAL DE MODALES Y MUTACIONES
  // ===================================================
  it('4. Flujo Completo - Debe levantar el modal de recepción, inyectar la orden y despachar la mutación masiva con éxito', async () => {
    renderContainer();

    // 1. Hacemos click en "Recibir" en la primera fila de la tabla
    const receiveBtn = screen.getByRole('button', { name: 'Recibir' });
    fireEvent.click(receiveBtn);

    // 2. Verificamos la apertura del Portal Modal con el título inyectado dinámicamente
    expect(await screen.findByRole('heading', { name: 'Auditoría de Entrada - PO-2026-001' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-reception-form')).toBeInTheDocument();

    // 3. Simulamos el submit dentro del formulario mockeado
    const confirmBtn = screen.getByRole('button', { name: 'Simular Confirmar' });
    fireEvent.click(confirmBtn);

    // 4. Certificamos que la mutación de TanStack Query ha sido invocada con el payload
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
  });

  // ===================================================
  // 🔴 ESCENARIO 5: MANEJO DE CAÍDAS DE RED (ROBUSTEZ)
  // ===================================================
  it('5. Robustez - Debe mostrar la alerta condicional si falla la pasarela de comunicación con Django', async () => {
    // Interceptamos la respuesta únicamente para este hilo de error
    vi.mocked(useDataTable).mockImplementation(({ key }: any) => {
      if (key === 'reception-purchase-orders') {
        return {
          data: undefined,
          isLoading: false,
          isError: true, 
          filters: { search: '', status: '', supplier: '', page: '1' },
          updateFilters: vi.fn(),
        } as any;
      }
      return { data: undefined, isLoading: false } as any;
    });

    renderContainer();

    await waitFor(() => {
      expect(screen.getByText(/Error al recuperar las órdenes de compra en el muelle de descarga/i)).toBeInTheDocument();
    });
  });
});