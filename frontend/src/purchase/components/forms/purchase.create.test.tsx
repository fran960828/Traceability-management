// src/modules/purchase/components/forms/__tests__/PurchaseForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PurchaseForm } from './purchase.create'; // Ajusta la ruta exacta de importación
import { useDataTable } from '../../../shared/hooks';
import { PURCHASE_ORDER_STATUS, type PurchaseOrder } from '../../models/purchase.schema';

// 1. Isolation: Aislamos el hook maestro de carga de catálogos
vi.mock('../../../shared/hooks', () => ({
  useDataTable: vi.fn(),
}));

describe('PurchaseForm - Unit & Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // Instancia base de una orden de compra en borrador para pruebas
  const mockPurchaseInitialData: PurchaseOrder = {
    id: 101,
    order_number: 'PO-2026-0101',
    supplier: 5,
    supplier_name: 'Distribuciones Riojanas S.L.',
    status: PURCHASE_ORDER_STATUS.DRAFT,
    date_issued: '2026-06-02T10:00:00Z',
    date_delivery_expected: '2026-06-15',
    notes: 'Embalaje paletizado estándar',
    items: [
      {
        id: 1,
        purchase_order: 101,
        packaging: 10,
        label: null,
        enological: null,
        quantity_ordered: 5000,
        quantity_received: 0,
        unit_price: '0.3500',
        material_name: 'Botella Bordelesa Élite'
      }
    ]
  };

  // Mocks de respuestas de los inventarios cruzados para alimentar los combo-box
  // 🟢 Enriquecemos el proveedor con la propiedad 'category' para que funcione el condicional
  const mockSuppliersResponse = { results: [{ id: 5, name: 'Distribuciones Riojanas S.L.', category: 'PACKAGING' }] };
  const mockPackagingResponse = { results: [{ id: 10, name: 'Botella Bordelesa Élite', specification: '75cl' }] };
  const mockLabelsResponse = { results: [{ id: 20, name: 'Frontal Ontalba Reserva' }] };
  const mockEnologicalResponse = { results: [{ id: 30, name: 'Metabisulfito Potásico', commercial_format: 'Saco 25kg' }] };

  beforeEach(() => {
    vi.clearAllMocks();

    // Enrutador inteligente de mocks por identificador de llave única del hook
    vi.mocked(useDataTable).mockImplementation((config: any) => {
      if (config.key === 'suppliers-select') return { data: mockSuppliersResponse } as any;
      if (config.key === 'pkg-select') return { data: mockPackagingResponse } as any;
      if (config.key === 'lbl-select') return { data: mockLabelsResponse } as any;
      if (config.key === 'eno-select') return { data: mockEnologicalResponse } as any;
      return { data: { results: [] } } as any;
    });
  });

  // ==========================================
  // 🟢 RENDERIZADO VISUAL Y ESTRUCTURA REJILLA
  // ==========================================

  it('1. Debe renderizar la cabecera en blanco y la advertencia de lista vacía', () => {
    render(<PurchaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    expect(screen.getByText('Datos de Cabecera y Distribuidor')).toBeInTheDocument();
    expect(screen.getByText(/Por favor, selecciona primero un Proveedor Homologado/i)).toBeInTheDocument();
  });

  it('2. Debe hidratar cabecera, bloquear el proveedor y pintar las líneas en modo edición', () => {
    render(
      <PurchaseForm
        productInitialData={mockPurchaseInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        activeAction="edit"
      />
    );
    expect(screen.getByText('Código Único de Pedido')).toBeInTheDocument();
    
    // Verificamos que el selector de proveedor queda bloqueado en edición (requisito ERP)
    expect(screen.getByLabelText(/Proveedor Homologado/i)).toBeDisabled();
    expect(screen.getByLabelText(/Observaciones \/ Notas de Compra/i)).toHaveValue('Embalaje paletizado estándar');
  });

  // ==========================================
  // ⚡ COMPORTAMIENTOS DINÁMICOS E INTERACTIVOS
  // ==========================================

  it('3. Debe añadir una línea con el selector exclusivo correspondiente a la categoría del proveedor', async () => {
    render(<PurchaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    // 🟢 PASO INTERMEDIO NUEVO: Primero seleccionamos un distribuidor para que se habiliten las líneas
    fireEvent.change(screen.getByLabelText(/Proveedor Homologado \*/i), { target: { value: '5' } });

    // Añadimos artículo interactivo con el nuevo nombre de botón
    fireEvent.click(screen.getByRole('button', { name: /\+ Añadir Artículo/i }));

    // 🟢 Verificamos el selector unificado condicional bajo el nuevo texto de etiqueta
    const packagingSelect = screen.getByLabelText(/Línea #1 - Artículo/i);
    expect(packagingSelect).toBeInTheDocument();
    
    // Las otras etiquetas de las otras categorías NO deben existir en el DOM por el render condicional
    expect(screen.queryByLabelText(/Línea #1 - Etiqueta/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Línea #1 - Compuesto Enológico/i)).not.toBeInTheDocument();

    // Seleccionamos la opción de packaging
    fireEvent.change(packagingSelect, { target: { value: '10' } });
    expect(packagingSelect).toHaveValue('10');

    // 🟢 Si removemos el ítem pulsando la nueva aspa "×" mediante su título de accesibilidad
    fireEvent.click(screen.getByRole('button', { name: /x/i }));
    expect(packagingSelect).not.toBeInTheDocument();
  });

  // ==========================================
  // 🛑 RESTRICCIONES DE VALIDACIÓN (ZOD)
  // ==========================================

  it('4. Debe interceptar la sumisión y advertir si la orden carece de líneas de producto', async () => {
    render(<PurchaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    // Seleccionamos un distribuidor pero dejamos la lista vacía de suministros
    fireEvent.change(screen.getByLabelText(/Proveedor Homologado \*/i), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Registrar Orden de Compra/i }));

    await waitFor(() => {
      expect(screen.getByText(/Una orden de compra debe tener al menos una línea de producto/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('5. Debe despachar el callback onSubmit con el payload anidado e íntegro para Django', async () => {
    render(<PurchaseForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    // Rellenamos cabecera
    fireEvent.change(screen.getByLabelText(/Proveedor Homologado \*/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Entrega Estimada/i), { target: { value: '2026-06-15' } });
    fireEvent.change(screen.getByLabelText(/Observaciones/i), { target: { value: 'Entrega prioritaria' } });

    // Agregamos material e inyectamos valores válidos (usando los nuevos nombres de controles)
    fireEvent.click(screen.getByRole('button', { name: /\+ Añadir Artículo/i }));
    fireEvent.change(screen.getByLabelText(/Línea #1 - Artículo/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Cantidad \*/i), { target: { value: '2500' } });
    fireEvent.change(screen.getByLabelText(/Precio \(€\/u\) \*/i), { target: { value: '0.1250' } });

    fireEvent.click(screen.getByRole('button', { name: /Registrar Orden de Compra/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          supplier: '5',
          status: 'DRAFT',
          date_delivery_expected: '2026-06-15',
          notes: 'Entrega prioritaria',
          items: expect.arrayContaining([
            expect.objectContaining({
              packaging: '10',
              label: '',
              enological: '',
              quantity_ordered: 2500,
              unit_price: '0.1250'
            })
          ])
        }),
        expect.any(Object)
      );
    });
  });

  it('6. Edge Case - Debe bloquear campos críticos de la orden si el estado inicial de la instancia es CLOSED o CANCELLED', () => {
    // Forzamos una orden con estado CERRADA para la prueba
    const mockClosedOrder: PurchaseOrder = {
      ...mockPurchaseInitialData,
      status: PURCHASE_ORDER_STATUS.CLOSED,
    };

    render(
      <PurchaseForm
        productInitialData={mockClosedOrder}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        activeAction="edit"
      />
    );

    // 🔒 Verificaciones de Inmutabilidad en la UI:    
    // 1. El proveedor DEBE estar deshabilitado
    expect(screen.getByLabelText(/Proveedor Homologado/i)).toBeDisabled();

    // 2. El selector de Estado de Gestión DEBE estar deshabilitado por el nuevo bloqueo inteligente
    expect(screen.getByLabelText(/Estado de Gestión/i)).toBeDisabled();

    // 3. Verificamos que la línea cargada renderiza el selector condicional de Artículo bloqueado/disponible según corresponda
    const packagingSelect = screen.getByLabelText(/Línea #1 - Artículo/i);
    expect(packagingSelect).toHaveValue('10');
  });
});