// src/modules/pricing/components/forms/__tests__/IndirectCostForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndirectCostForm } from './IndirectCostForm';
import type { IndirectCostConfig } from '../../models/indirectCost.schema';

describe('IndirectCostForm - Unit & Functional Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // Instancia base de configuración de tasas para pruebas de hidratación
  const mockInitialData: IndirectCostConfig = {
    id: 10,
    name: 'Tasas Generales 2026',
    labor_rate: '0.1200',
    energy_rate: '0.0450',
    amortization_rate: '0.0800',
    is_active: true,
    created_at: '2026-08-12T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================
  // 📊 ESCENARIOS 1: RENDERIZADO VISUAL E HIDRATACIÓN (GET)
  // ========================================================

  it('1. Debe renderizar el formulario en blanco para modo creación', () => {
    render(<IndirectCostForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/Nombre de la Configuración \*/i)).toHaveValue('');
    expect(screen.getByLabelText(/Mano de Obra \(€\/unidad\) \*/i)).toHaveValue(0);
    expect(screen.getByLabelText(/Energía y Suministros \(€\/unidad\) \*/i)).toHaveValue(0);
    expect(screen.getByLabelText(/Amortización de Maquinaria \(€\/unidad\) \*/i)).toHaveValue(0);
    expect(screen.getByLabelText(/Establecer como la configuración de tasas vigente/i)).toBeChecked();

    expect(screen.getByRole('button', { name: /Crear Configuración/i })).toBeInTheDocument();
  });

  it('2. Debe hidratar los campos de entrada y los metadatos de lectura en modo edición', () => {
    render(
      <IndirectCostForm
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Campos de solo lectura para auditoría
    expect(screen.getByText('Identificador Único')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();

    // Valores parseados como números en los inputs
    expect(screen.getByLabelText(/Nombre de la Configuración \*/i)).toHaveValue('Tasas Generales 2026');
    expect(screen.getByLabelText(/Mano de Obra \(€\/unidad\) \*/i)).toHaveValue(0.12);
    expect(screen.getByLabelText(/Energía y Suministros \(€\/unidad\) \*/i)).toHaveValue(0.045);
    expect(screen.getByLabelText(/Amortización de Maquinaria \(€\/unidad\) \*/i)).toHaveValue(0.08);

    expect(screen.getByRole('button', { name: /Actualizar Tasas/i })).toBeInTheDocument();
  });

  // ========================================================
  // 🛑 ESCENARIOS 2: RESTRICCIONES Y VALIDACIONES (ZOD)
  // ========================================================

  it('3. Debe detener la sumisión y advertir si el nombre es demasiado corto', async () => {
    render(<IndirectCostForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/Nombre de la Configuración \*/i), { target: { value: 'AB' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear Configuración/i }));

    await waitFor(() => {
      expect(screen.getByText(/El nombre debe tener al menos 3 caracteres/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('4. Debe detener la sumisión si se ingresan tasas negativas', async () => {
    render(<IndirectCostForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/Nombre de la Configuración \*/i), { target: { value: 'Tasa Inválida' } });
    fireEvent.change(screen.getByLabelText(/Mano de Obra \(€\/unidad\) \*/i), { target: { value: '-0.05' } });

    fireEvent.click(screen.getByRole('button', { name: /Crear Configuración/i }));

    await waitFor(() => {
      expect(screen.getByText(/La tasa de mano de obra no puede ser negativa/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('5. Debe detener la sumisión si una tasa supera el límite máximo de 1.0000 €/unidad', async () => {
    render(<IndirectCostForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/Nombre de la Configuración \*/i), { target: { value: 'Tasa Excesiva' } });
    fireEvent.change(screen.getByLabelText(/Energía y Suministros \(€\/unidad\) \*/i), { target: { value: '1.5' } });

    fireEvent.click(screen.getByRole('button', { name: /Crear Configuración/i }));

    await waitFor(() => {
      expect(screen.getByText(/La tasa no puede superar 1.0000 €\/unidad/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  // ========================================================
  // ⚡ ESCENARIOS 3: COMPORTAMIENTOS Y ENVÍO (POST/PUT)
  // ========================================================

  it('6. Debe despachar onSubmit con el payload correcto al enviar valores válidos', async () => {
    render(<IndirectCostForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/Nombre de la Configuración \*/i), { target: { value: 'Tasas Extraordinarias 2026' } });
    fireEvent.change(screen.getByLabelText(/Mano de Obra \(€\/unidad\) \*/i), { target: { value: '0.1500' } });
    fireEvent.change(screen.getByLabelText(/Energía y Suministros \(€\/unidad\) \*/i), { target: { value: '0.0500' } });
    fireEvent.change(screen.getByLabelText(/Amortización de Maquinaria \(€\/unidad\) \*/i), { target: { value: '0.0900' } });

    fireEvent.click(screen.getByRole('button', { name: /Crear Configuración/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        {
          name: 'Tasas Extraordinarias 2026',
          labor_rate: 0.15,
          energy_rate: 0.05,
          amortization_rate: 0.09,
          is_active: true,
        },
        expect.any(Object)
      );
    });
  });

  it('7. Debe gatillar el callback onCancel al pulsar el botón Cancelar', () => {
    render(<IndirectCostForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  // ========================================================
  // 🔒 ESCENARIOS 4: ESTADOS DE BLOQUEO (IS SUBMITTING)
  // ========================================================

  it('8. Debe deshabilitar los botones de acción durante el estado de sumisión (isSubmitting)', () => {
    render(
      <IndirectCostForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={true}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    expect(cancelBtn).toBeDisabled();

    expect(screen.getByText(/Guardando.../i)).toBeInTheDocument();
  });

  // ========================================================
  // 🧪 ESCENARIOS 5: CASOS DE FRONTERA (EDGE CASES)
  // ========================================================

  it('9. Edge Case - Debe desmarcar el checkbox is_active de forma reactiva', async () => {
    render(<IndirectCostForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const activeCheckbox = screen.getByLabelText(/Establecer como la configuración de tasas vigente/i);
    expect(activeCheckbox).toBeChecked();

    fireEvent.click(activeCheckbox);
    expect(activeCheckbox).not.toBeChecked();

    fireEvent.change(screen.getByLabelText(/Nombre de la Configuración \*/i), { target: { value: 'Tasas Inactivas' } });
    fireEvent.change(screen.getByLabelText(/Mano de Obra \(€\/unidad\) \*/i), { target: { value: '0.10' } });

    fireEvent.click(screen.getByRole('button', { name: /Crear Configuración/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
        }),
        expect.any(Object)
      );
    });
  });
});