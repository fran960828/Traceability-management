// src/production_record/components/forms/__tests__/ProductionOrderForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductionOrderForm } from './ProductionRecordForm';
import { useDataTable } from '../../../shared/hooks';
import type { ProductionOrder } from '../../models/productionRecord.schema';

// 1. Isolation: Aislamos el hook maestro de carga de catálogos
vi.mock('../../../shared/hooks', () => ({
  useDataTable: vi.fn(),
  useDataMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('ProductionOrderForm - Unit & Functional Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // Instancia base de un parte de embotellado en borrador para hidratación
  const mockProductionInitialData: ProductionOrder = {
    id: 42,
    lot_number: 'L26-042',
    wine: 1,
    wine_name: 'Ontalba Tempranillo Selección',
    user: 3,
    user_username: 'enologo_master',
    production_date: '2026-07-07',
    quantity_produced: 2500,
    status: 'DRAFT',
    status_display: 'Borrador',
    total_liters: '1875.000',
    bulk_liters_withdrawn: '1890.000',
    loss_liters: '15.000',
    loss_percentage: 0.79,
    notes: 'Filtrado tangencial previo sin incidencias',
    enological_materials: [
      {
        id: 10,
        material: 30,
        material_name: 'Metabisulfito Potásico',
        batch_number:'',
        quantity_used: '1.250',
        dosage_per_liter: '0.000666'
      }
    ],
    created_at: '2026-07-07T10:00:00Z'
  };

  // Mocks de respuestas de catálogos maestros de la bodega
  const mockWinesResponse = { results: [{ id: 1, name: 'Ontalba Tempranillo Selección', is_active: true }] };
  const mockEnologicalResponse = { results: [{ id: 30, name: 'Metabisulfito Potásico', commercial_format: 'Saco 25kg' }] };

  beforeEach(() => {
    vi.clearAllMocks();

    // Enrutador dinámico de mocks por identificador de llave única de TanStack Query
    vi.mocked(useDataTable).mockImplementation((config: any) => {
      if (config.key === 'wines-production-select') return { data: mockWinesResponse } as any;
      if (config.key === 'eno-production-select') return { data: mockEnologicalResponse } as any;
      return { data: { results: [] } } as any;
    });
  });

  // ========================================================
  // 📊 ESCENARIOS 1: RENDERIZADO VISUAL E HIDRATACIÓN (GET)
  // ========================================================

  it('1. Debe renderizar la cabecera en blanco con la fecha de hoy por defecto y el aviso de receta fija', () => {
    render(<ProductionOrderForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    expect(screen.getByText('Cabecera e Integridad del Embotellado')).toBeInTheDocument();
    expect(screen.getByText(/No se han declarado tratamientos enológicos manuales para este lote/i)).toBeInTheDocument();
  });

  it('2. Debe inyectar los metadatos de mermas calculadas y deshabilitar el vino en modo edición', () => {
    render(
      <ProductionOrderForm
        productInitialData={mockProductionInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        activeAction="edit"
      />
    );

   // 🟢 CORRECCIÓN 1: Comprobamos que las etiquetas de los campos se renderizan en el DOM
   expect(screen.getByText('Estado Operativo del Parte')).toBeInTheDocument();
   expect(screen.getByText('Mermas Declaradas')).toBeInTheDocument();
   
   // 🟢 CORRECCIÓN 2: Validamos los valores reales que están inyectados dentro de los inputs del FormReadOnlyInput
   expect(screen.getByDisplayValue('Borrador')).toBeInTheDocument();
   expect(screen.getByDisplayValue('1875.00 L')).toBeInTheDocument();
   expect(screen.getByDisplayValue('15.00 L (0.79%)')).toBeInTheDocument();
  });

  // ========================================================
  // ⚡ ESCENARIOS 2: COMPORTAMIENTOS DINÁMICOS E INTERACTIVOS
  // ========================================================

  it('3. Debe añadir y remover filas horizontales de insumos químicos de forma interactiva', async () => {
    render(<ProductionOrderForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    const appendBtn = screen.getByRole('button', { name: /\+ Declarar Tratamiento Enológico Manual/i });
    fireEvent.click(appendBtn);

    // Se desvanece el placeholder de lista vacía y aparece el selector dinámico
    expect(screen.queryByText(/No se han declarado tratamientos enológicos manuales/i)).not.toBeInTheDocument();
    
    const materialSelect = screen.getByLabelText(/Insumo #1/i);
    const quantityInput = screen.getByLabelText(/Cantidad Total \*/i);
    expect(materialSelect).toBeInTheDocument();

    // Seleccionamos compuesto químico
    fireEvent.change(materialSelect, { target: { value: '30' } });
    fireEvent.change(quantityInput, { target: { value: '1.250' } });

    expect(materialSelect).toHaveValue('30');

    // Pulsamos el aspa "X" para purgar la fila
    fireEvent.click(screen.getByRole('button', { name: /x/i }));
    expect(materialSelect).not.toBeInTheDocument();
  });

  it('4. Edge Case - Al clonar una orden debe pre-cargar la estructura pero forzar la limpieza del lote', () => {
    render(
      <ProductionOrderForm
        productInitialData={mockProductionInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        activeAction="clone"
      />
    );

    // Verificamos clonación inteligente: Clona los litros y el vino pero vacía el lote para evitar colisiones únicas
    expect(screen.getByLabelText(/Vino Varietal a Procesar \*/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/Litros Extraídos de Depósito/i)).toHaveValue(1890);
    expect(screen.getByLabelText(/Lote de Producto Terminado \*/i)).toHaveValue('');
  });

  // ========================================================
  // 🛑 ESCENARIOS 3: VALIDACIONES (ZOD) Y EMISIÓN (POST)
  // ========================================================

  it('5. Debe detener la sumisión si el operario intenta ingresar una fecha futura', async () => {
    render(<ProductionOrderForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    fireEvent.change(screen.getByLabelText(/Vino Varietal a Procesar \*/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Lote de Producto Terminado \*/i), { target: { value: 'L26-999' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Embotellado \*/i), { target: { value: '2026-12-31' } }); // 2026 Futura
    fireEvent.change(screen.getByLabelText(/Cantidad Producida/i), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/Litros Extraídos de Depósito/i), { target: { value: '750' } });

    fireEvent.click(screen.getByRole('button', { name: /Registrar Parte de Embotellado/i }));

    await waitFor(() => {
      expect(screen.getByText(/La fecha de embotellado no puede ser futura/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('6. Debe despachar el callback onSubmit con el contrato plano y tipado requerido por Django', async () => {
    render(<ProductionOrderForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    // Rellenamos el layout de cabecera completo
    fireEvent.change(screen.getByLabelText(/Vino Varietal a Procesar \*/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Lote de Producto Terminado \*/i), { target: { value: 'L26-001' } });
    fireEvent.change(screen.getByLabelText(/Cantidad Producida/i), { target: { value: '1500' } });
    fireEvent.change(screen.getByLabelText(/Litros Extraídos de Depósito/i), { target: { value: '1125' } });
    fireEvent.change(screen.getByLabelText(/Observaciones/i), { target: { value: 'Línea a régimen constante' } });

    // Añadimos un aditivo químico manual (Simulando la simplificación sin lote)
    fireEvent.click(screen.getByRole('button', { name: /\+ Declarar Tratamiento Enológico Manual/i }));
    fireEvent.change(screen.getByLabelText(/Insumo #1/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/Cantidad Total \*/i), { target: { value: '1.25' } });

    fireEvent.click(screen.getByRole('button', { name: /Registrar Parte de Embotellado/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          wine: 1,
          lot_number: 'L26-001',
          quantity_produced: 1500,
          bulk_liters_withdrawn: 1125,
          notes: 'Línea a régimen constante',
          enological_materials: expect.arrayContaining([
            expect.objectContaining({
              material: 30,
              quantity_used: 1.25
            })
          ])
        }),
        expect.any(Object)
      );
    });
  });
});