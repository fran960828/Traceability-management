import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReceptionForm } from './reception.confirm'; // Ajustada ruta relativa de importación
import { useDataTable } from '../../../shared/hooks';
import type { PurchaseOrder } from '../../../purchase/models/purchase.schema';
import { PURCHASE_ORDER_STATUS } from '../../../purchase/models/purchase.schema';

// Isolation: Aislamos el gancho de carga de ubicaciones físicas
vi.mock('../../../shared/hooks', () => ({
  useDataTable: vi.fn(),
}));

describe('ReceptionForm - Unit & Functional Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // Instancia base de una orden de compra parcial devuelta por el servicio de compras
  const mockPurchaseOrderData: PurchaseOrder = {
    id: 50,
    order_number: 'PO-2026-0050',
    supplier: 3,
    supplier_name: 'Bodegas Ontalba Distribución',
    status: PURCHASE_ORDER_STATUS.PARTIAL,
    date_issued: '2026-06-02T12:00:00Z',
    date_delivery_expected: '2026-06-15',
    notes: 'Pedido inicial',
    items: [
      {
        id: 10,
        purchase_order: 50,
        packaging: 1,
        label: null,
        enological: null,
        quantity_ordered: 5000,
        quantity_received: 2000, // Hay 3000 pendientes
        unit_price: '0.2500',
        material_name: 'Botella Bordelesa Elite 75cl'
      },
      {
        id: 11,
        purchase_order: 50,
        packaging: 2,
        label: null,
        enological: null,
        quantity_ordered: 1000,
        quantity_received: 1000, // 0 Pendientes: ¡Debe filtrarse preventivamente!
        unit_price: '0.0500',
        material_name: 'Corcho técnico'
      }
    ]
  };

  // Catálogo maestro de ubicaciones operativas devuelto por el sub-servicio
  const mockLocationsResponse = {
    results: [
      { id: 2, name: 'ALMACEN_GENERAL', description: 'Nave central', is_active: true },
      { id: 4, name: 'SILO_PRODUCCION', description: 'Zona tanques', is_active: false }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDataTable).mockReturnValue({
      data: mockLocationsResponse,
      isLoading: false,
      isError: false,
    } as any);
  });

  // ===================================================
  // 🟢 SECCIÓN 1: HIDRATACIÓN Y FILTRADO PREVENTIVO
  // ===================================================
  it('1. Debe renderizar la información de cabecera de la orden, cargar las ubicaciones activas y calcular los saldos pendientes', () => {
    render(
      <ReceptionForm 
        purchaseOrderData={mockPurchaseOrderData} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    // Verificamos vinculación semántica de cabecera corregida
    expect(screen.getByRole('heading', { name: /Recepción de Pedido - PO-2026-0050/i })).toBeInTheDocument();
    expect(screen.getByText('Bodegas Ontalba Distribución')).toBeInTheDocument();

    // Verificamos cálculo dinámico de ayuda visual para el bodeguero
    expect(screen.getByText(/Botella Bordelesa Elite 75cl/i)).toBeInTheDocument();
    // 🎯 CORRECCIÓN: Buscamos el texto exacto renderizado por el componente
    expect(screen.getByText(/Máx\. esperado: 3000/i)).toBeInTheDocument();

    // REGLA DE FILTRADO: El corcho técnico ya está completamente servido, no debe aparecer en la rejilla de conteo
    expect(screen.queryByText(/Corcho técnico/i)).not.toBeInTheDocument();
  });

  // ===================================================
  // 🛑 TEST 2: INTERCEPCIÓN DE LOCALIZACIÓN POR LÍNEA
  // ===================================================
  it('2. Debe interceptar la sumisión y advertir si el operario no ha seleccionado una localización específica para el artículo', async () => {
    render(
      <ReceptionForm purchaseOrderData={mockPurchaseOrderData} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // Rellenamos el lote y la cantidad de la línea, pero dejamos la ubicación en blanco
    fireEvent.change(screen.getByLabelText(/Lote Físico \*/i), { target: { value: 'LOTE-TEST-01' } });
    // 🎯 CORRECCIÓN: Usamos la etiqueta real del componente "Cantidad a Recibir *"
    fireEvent.change(screen.getByLabelText(/Cantidad a Recibir \*/i), { target: { value: '1000' } });

    // Forzamos el submit pulsando el botón primario
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Entrada de Almacén/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirmar Entrada de Almacén/i })).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  // ===================================================
  // 🛑 TEST 3: COMPROBACIÓN DE LOTES DUPLICADOS
  // ===================================================
  it('3. Debe lanzar una alerta de bloqueo global si se introducen números de lote duplicados en la misma descarga', async () => {
    const mockMultiLineOrder: PurchaseOrder = {
      ...mockPurchaseOrderData,
      items: [
        { ...mockPurchaseOrderData.items![0], id: 10, material_name: 'Botella Bordelesa Elite 75cl' },
        { ...mockPurchaseOrderData.items![0], id: 12, material_name: 'Tapón Corcho Natural' }
      ]
    };

    render(
      <ReceptionForm purchaseOrderData={mockMultiLineOrder} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // 🎯 CORRECCIÓN: El selector se llama "Almacén *" en tu formulario
    const locationSelects = screen.getAllByLabelText(/Almacén \*/i);
    fireEvent.change(locationSelects[0], { target: { value: '2' } });
    fireEvent.change(locationSelects[1], { target: { value: '2' } });

    // Asignamos el mismo string de lote en ambas celdas
    const batchInputs = screen.getAllByLabelText(/Lote Físico \*/i);
    fireEvent.change(batchInputs[0], { target: { value: 'LOTE-REPETIDO' } });
    fireEvent.change(batchInputs[1], { target: { value: 'LOTE-REPETIDO' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Entrada de Almacén/i }));

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // ===================================================
  // 🚀 TEST 4: PAYLOAD CONTRATO COMPLETO DRF SPECTACULAR
  // ===================================================
  it('4. Debe recopilar de forma nativa los datos de cada fila y despachar el array de ítems limpio para Django', async () => {
    render(
      <ReceptionForm purchaseOrderData={mockPurchaseOrderData} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // 🎯 CORRECCIÓN: Modificamos selectores para que coincidan con "Almacén *" y "Cantidad a Recibir *"
    fireEvent.change(screen.getByLabelText(/Almacén \*/i), { target: { value: '2' } });

    fireEvent.change(screen.getByLabelText(/Lote Físico \*/i), { target: { value: 'B-99882-X' } });
    fireEvent.change(screen.getByLabelText(/Cantidad a Recibir \*/i), { target: { value: '1500' } });

    // Despachamos
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Entrada de Almacén/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    const dispatchedPayload = mockOnSubmit.mock.calls[0][0];
    
    expect(dispatchedPayload).not.toHaveProperty('location'); // No hay localización global en raíz
    expect(dispatchedPayload.items).toHaveLength(1);
    expect(dispatchedPayload.items[0]).toEqual({
      order_item: 10,
      location: 2, 
      material_name: "Botella Bordelesa Elite 75cl",
      batch_number: 'B-99882-X',
      quantity: 1500,
      pending_quantity: 3000,
      expiry_date: null, // Modificado a null reflejando la inicialización del useEffect vacía ('') transformada por Zod
      notes: ''
    });
  });

  // ===================================================
  // 🟢 TEST 5: CANCELAR
  // ===================================================
  it('5. Debe gatillar el callback onCancel de forma limpia al presionar Cancelar', () => {
    render(
      <ReceptionForm purchaseOrderData={mockPurchaseOrderData} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});