import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockAdjustmentForm } from './stock.adjustmentForm';
import { MOVEMENT_TYPE } from '../../../reception/models/';

describe('StockAdjustmentForm - Unit & Functional Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // 🟢 1. Datos iniciales simulados de alta fidelidad que el contenedor inyecta desde la fila
  const mockInitialMovementData = {
    id: 201,
    batch: 14,
    batch_detail: {
      id: 14,
      batch_number: 'LOT-2026-X45',
      material_name: 'Ácido Tartárico',
      arrival_date: '2026-06-19',
      expiry_date: null,
      current_stock_cache: '150.000',
      stock_status: 'AVAILABLE' as any
    },
    batch_number: 'LOT-2026-X45',
    product_name: 'Ácido Tartárico',
    location: 2,
    location_name: 'CÁMARA_ENOLÓGICA_A',
    quantity: '150.000',
    movement_type: MOVEMENT_TYPE.IN,
    movement_type_display: 'Entrada (Compra/Recepciones)',
    reference_po: 42,
    user: 1,
    user_full_name: 'Enólogo de Guardia',
    created_at: '2026-06-19T08:00:00Z',
    notes: 'Entrada de muelle',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================================================
  // 🟢 TEST 1: RENDERIZADO E HIDRATACIÓN DIRECTA
  // ===================================================
  it('1. Debe hidratar la meta-card de auditoría de forma inmediata usando los datos del lote contextual', () => {
    render(
      <StockAdjustmentForm 
        initialMovementData={mockInitialMovementData} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    expect(screen.getByRole('heading', { name: /Ajuste de Inventario y Mermas/i })).toBeInTheDocument();
    
    // Verificamos que los textos estáticos informativos se pinten correctamente
    expect(screen.getByText('Ácido Tartárico')).toBeInTheDocument();
    expect(screen.getByText('LOT-2026-X45')).toBeInTheDocument();
    expect(screen.getByText('CÁMARA_ENOLÓGICA_A')).toBeInTheDocument();
    expect(screen.getByText('150.000 uds')).toBeInTheDocument();
  });

  // ===================================================
  // 🛑 TEST 2: INTERCEPCIÓN DE NOTAS CORTAS (VALIDACIÓN ZOD)
  // ===================================================
  it('2. Debe bloquear la sumisión si la justificación obligatoria no cumple los caracteres mínimos', async () => {
    render(
      <StockAdjustmentForm 
        initialMovementData={mockInitialMovementData} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    // Escribimos una cantidad válida pero una nota de solo 4 caracteres (Zod exige mín. 5)
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cantidad a Retirar \/ Merma \*/i }), { target: { value: '10' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Justificación Obligatoria del Ajuste/i }), { target: { value: 'Roto' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Ajuste de Stock/i }));

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // ===================================================
  // 🚀 TEST 3: COMPROBACIÓN DEL AUTO-INTERCEPTOR DE SIGNOS
  // ===================================================
  it('3. UX Premium - Debe permitir al usuario escribir en positivo y convertir la cantidad automáticamente a negativo', async () => {
    render(
      <StockAdjustmentForm 
        initialMovementData={mockInitialMovementData} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    // El operario escribe "25" en positivo
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cantidad a Retirar \/ Merma \*/i }), { target: { value: '25' } });
    
    fireEvent.change(screen.getByRole('textbox', { name: /Justificación Obligatoria del Ajuste/i }), { 
      target: { value: 'Rotura accidental de saco durante traslado' } 
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Ajuste de Stock/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    // Verificación: handleFormSubmit le ha dado la vuelta al signo con éxito para cumplir con Django
    const payload = mockOnSubmit.mock.calls[0][0];
    expect(payload.quantity).toBe(-25);
  });

  // ===================================================
  // 🚀 TEST 4: PRESERVACIÓN SI YA SE MANDA NEGATIVO POR SUBMIT DIRECTO
  // ===================================================
  it('4. Debe comprobar que el payload final inyecta los IDs planos requeridos por el backend', async () => {
    render(
      <StockAdjustmentForm 
        initialMovementData={mockInitialMovementData} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    fireEvent.change(screen.getByRole('spinbutton', { name: /Cantidad a Retirar \/ Merma \*/i }), { target: { value: '15' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Justificación Obligatoria del Ajuste/i }), { 
      target: { value: 'Muestra para laboratorio de control' } 
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Ajuste de Stock/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    const payload = mockOnSubmit.mock.calls[0][0];
    expect(payload).toEqual({
      batch: 14,
      location: 2,
      quantity: -15, // Verificamos la consistencia total del objeto mapeado
      notes: 'Muestra para laboratorio de control'
    });
  });

  // ===================================================
  // 🟢 TEST 5: DISPARO DE CANCELAR
  // ===================================================
  it('5. Debe gatillar el callback onCancel de forma limpia al presionar Cancelar Operación', () => {
    render(
      <StockAdjustmentForm 
        initialMovementData={mockInitialMovementData} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancelar Operación/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  })});