// src/production_record/components/forms/__tests__/ProductionConfirmForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductionConfirmForm } from './ProductionConfirmForm';
import type { ProductionOrder } from '../../models/productionRecord.schema';

describe('ProductionConfirmForm - Unit & Functional Integration Tests', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  // Instancia base de un parte de embotellado para el diálogo de confirmación
  const mockOrderData: ProductionOrder = {
    id: 101,
    lot_number: 'L26-001',
    wine: 5,
    wine_name: 'Ontalba Verdejo Selección',
    user: 2,
    user_username: 'bodeguero_senior',
    production_date: '2026-08-10',
    quantity_produced: 5000,
    status: 'DRAFT',
    status_display: 'Borrador',
    total_liters: '3750.000',
    bulk_liters_withdrawn: '3780.000',
    loss_liters: '30.000',
    loss_percentage: 0.79,
    notes: 'Llenado a 15°C',
    enological_materials: [
      {
        id: 1,
        material: 12,
        material_name: 'Sulfito Líquido',
        batch_number: 'LOT-SL-009',
        quantity_used: '2.500',
        dosage_per_liter: '0.000666',
      },
    ],
    created_at: '2026-08-10T08:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================
  // 📊 ESCENARIOS 1: RENDERIZADO VISUAL Y ESTRUCTURA DE IMPACTO
  // ========================================================

  it('1. Debe renderizar el banner de advertencia, el resumen técnico y la lista de impactos en inventario', () => {
    render(
      <ProductionConfirmForm
        order={mockOrderData}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Banner de advertencia
    expect(screen.getByText('Acción Transaccional Irreversible')).toBeInTheDocument();
    expect(screen.getByText(/se disparará el cierre oficial del registro/i)).toBeInTheDocument();

    // Resumen técnico hidratado
    expect(screen.getByText('Ontalba Verdejo Selección')).toBeInTheDocument();
    expect(screen.getByText('L26-001')).toBeInTheDocument();
    expect(screen.getByText('5000 botellas')).toBeInTheDocument();
    expect(screen.getByText('3780.00 Litros')).toBeInTheDocument();

    // Bloque explicativo de impacto
    expect(screen.getByText('Impacto Inmediato en Sistema:')).toBeInTheDocument();
    expect(screen.getByText(/Se descontará el vino base del depósito asignado/i)).toBeInTheDocument();
    expect(screen.getByText(/Se descontarán envases, tapones, cápsulas y etiquetas/i)).toBeInTheDocument();
    expect(screen.getByText(/no podrá ser modificado ni eliminado/i)).toBeInTheDocument();
  });

  // ========================================================
  // ⚡ ESCENARIOS 2: COMPORTAMIENTO INTERACTIVO Y CALLBACKS
  // ========================================================

  it('2. Debe gatillar el callback onConfirm al presionar el botón de confirmación', () => {
    render(
      <ProductionConfirmForm
        order={mockOrderData}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmBtn = screen.getByRole('button', {
      name: /Confirmar Cierre y Descontar Stock/i,
    });
    fireEvent.click(confirmBtn);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('3. Debe gatillar el callback onCancel al presionar el botón Cancelar', () => {
    render(
      <ProductionConfirmForm
        order={mockOrderData}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  // ========================================================
  // 🔒 ESCENARIOS 3: ESTADOS DE CARGA Y BLOQUEOS (IS SUBMITTING)
  // ========================================================

  it('4. Debe deshabilitar el botón de cancelar y mostrar el indicador de carga cuando isSubmitting es true', () => {
    render(
      <ProductionConfirmForm
        order={mockOrderData}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isSubmitting={true}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    expect(cancelBtn).toBeDisabled();

    // Verificamos que el botón primario cambió su texto al estado de procesamiento FIFO
    expect(screen.getByText(/Ejecutando FIFO.../i)).toBeInTheDocument();
  });

  // ========================================================
  // 🧪 ESCENARIOS 4: CASOS DE FRONTERA (EDGE CASES)
  // ========================================================

  it('5. Edge Case - Debe mostrar "Sin lote" si el número de lote viene vacío o nulo', () => {
    const orderWithoutLot: ProductionOrder = {
      ...mockOrderData,
      lot_number: '',
    };

    render(
      <ProductionConfirmForm
        order={orderWithoutLot}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Sin lote')).toBeInTheDocument();
  });

  it('6. Edge Case - Debe formatear correctamente cantidades numéricas en formato de texto', () => {
    const orderWithNumericStrings: ProductionOrder = {
      ...mockOrderData,
      quantity_produced: 12500,
      bulk_liters_withdrawn: '9375.250',
    };

    render(
      <ProductionConfirmForm
        order={orderWithNumericStrings}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('12.500 botellas')).toBeInTheDocument();
    expect(screen.getByText('9375.25 Litros')).toBeInTheDocument();
  });
});