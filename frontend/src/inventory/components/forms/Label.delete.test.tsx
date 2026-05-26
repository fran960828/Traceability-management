import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LabelDeleteForm } from './Label.delete';
import { LABEL_TYPES, UNIT_MESURE, type LabelMaterial } from '../../models/label.schema';

describe('LabelDeleteForm - Unit Tests', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  // Ficha técnica mockeada del material que se pretende borrar
  const mockLabelData: LabelMaterial = {
    id: 42,
    internal_code:'ETI01-2026',
    name: 'Etiqueta Contraetiqueta Ontalba Reserva',
    supplier: 2,
    label_type: LABEL_TYPES.CONTRA,
    label_type_display: 'Contraetiqueta',
    brand_reference: 'Ontalba Tempranillo Reserva',
    vintage: 2023,
    unit_mesure: UNIT_MESURE.UNIDAD,
    unit_mesure_display: 'Unidades',
    min_stock_level: '1000.00',
    current_stock: '4500.00',
    is_low_stock: false,
    is_active: true,
    description: 'Papel mate con stamping oro',
    created_at: '2023-05-10T08:30:00Z',
    updated_at: '2023-05-10T08:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 🟢 HAPPY PATHS (RENDIMIENTO E INTERFAZ)
  // ==========================================

  it('1. Debe renderizar la advertencia con los datos específicos del material a eliminar', () => {
    render(
      <LabelDeleteForm 
        labelData={mockLabelData} 
        onConfirm={mockOnConfirm} 
        onCancel={mockOnCancel} 
      />
    );

    // Comprobamos los textos críticos de seguridad en pantalla
    expect(screen.getByRole('heading', { name: /¿Eliminar Etiqueta\?/i })).toBeInTheDocument();
    expect(screen.getByText(mockLabelData.name)).toBeInTheDocument();
    // 🔄 CAMBIO: Buscamos la marca del vino mediante una Regex flexible
    expect(screen.getByText(new RegExp(mockLabelData.brand_reference, 'i'))).toBeInTheDocument();
    
    // Verificamos que se advierte explícitamente sobre el código interno autogenerado
    expect(screen.getByText(mockLabelData.internal_code)).toBeInTheDocument();

    // Comprobamos la existencia de la botonera en estado inicial activo
    expect(screen.getByRole('button', { name: /No, Cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sí, Eliminar/i })).toBeInTheDocument();
  });

  it('2. Debe disparar el evento onCancel al accionar el botón de descarte', () => {
    render(
      <LabelDeleteForm 
        labelData={mockLabelData} 
        onConfirm={mockOnConfirm} 
        onCancel={mockOnCancel} 
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /No, Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('3. Debe enviar el ID correcto del material al confirmar la eliminación', () => {
    render(
      <LabelDeleteForm 
        labelData={mockLabelData} 
        onConfirm={mockOnConfirm} 
        onCancel={mockOnCancel} 
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /Sí, Eliminar/i });
    fireEvent.click(deleteBtn);

    // Verificamos que el callback del contenedor recibe el ID numérico que espera la API de Django
    expect(mockOnConfirm).toHaveBeenCalledWith(42);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  // ==========================================
  // 🛑 EDGE CASES (CONCURRENCIA Y BLOQUEOS)
  // ==========================================

  it('4. Debe desactivar botones y mutar textos si el formulario está en proceso de envío (isSubmitting)', () => {
    render(
      <LabelDeleteForm 
        labelData={mockLabelData} 
        onConfirm={mockOnConfirm} 
        onCancel={mockOnCancel} 
        isSubmitting={true} // Simula que la mutación de TanStack Query está en marcha
      />
    );

    // El botón de cancelar debe bloquearse por prop disabled
    expect(screen.getByRole('button', { name: /No, Cancelar/i })).toBeDisabled();

    // El botón de submit cambia su texto al label de carga del componente genérico
    expect(screen.getByRole('button', { name: /Eliminando\.\.\./i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Eliminando\.\.\./i })).toBeDisabled();
  });

  it('5. Debe activar el cortocircuito de seguridad en el submit si ya se está procesando una petición', () => {
    render(
      <LabelDeleteForm 
        labelData={mockLabelData} 
        onConfirm={mockOnConfirm} 
        onCancel={mockOnCancel} 
        isSubmitting={true} // Hilo de red ocupado
      />
    );

    // Intentamos forzar el submit enviando el formulario directamente (ej. pulsando ENTER en el teclado)
    const formElement = screen.getByRole('heading', { name: /¿Eliminar Etiqueta\?/i }).closest('form');
    fireEvent.submit(formElement!);

    // Gracias al `if (isSubmitting) return;` el callback no se ejecuta de nuevo
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});