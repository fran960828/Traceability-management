import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenericDeleteForm } from './forms.delete';

describe('GenericDeleteForm - Shared Unit Tests', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  // Props base simulando el borrado de una etiqueta de Ontalba
  const baseProps = {
    id: 505,
    title: '¿Eliminar Material de Inventario?',
    name: 'Etiqueta Frontal Tempranillo',
    subtitle: 'Ontalba Crianza',
    codeLabel: 'código interno',
    codeValue: 'LBL-505-2026',
    impactMessage: 'Las órdenes de embotellado activas podrían quedar bloqueadas.',
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
    isSubmitting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 🟢 HAPPY PATHS (RENDIMIENTO E INTERFAZ)
  // ==========================================

  it('1. Debe renderizar correctamente todos los textos inyectados por configuración', () => {
    render(<GenericDeleteForm {...baseProps} />);

    // Título y nombres destacados de seguridad
    expect(screen.getByRole('heading', { name: new RegExp(baseProps.title, 'i') })).toBeInTheDocument();
    expect(screen.getByText(baseProps.name)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(baseProps.subtitle, 'i'))).toBeInTheDocument();

    // Bloque de advertencia técnico y su mensaje de impacto operativo
    expect(screen.getByText(new RegExp(`dará de baja el ${baseProps.codeLabel}`, 'i'))).toBeInTheDocument();
    expect(screen.getByText(baseProps.codeValue)).toBeInTheDocument();
    expect(screen.getByText(baseProps.impactMessage)).toBeInTheDocument();

    // Botonera inicial activa
    expect(screen.getByRole('button', { name: /No, Cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sí, Eliminar/i })).toBeInTheDocument();
  });

  it('2. Debe ocultar los paréntesis del subtítulo si este viene vacío (Prop Opcional)', () => {
    // Forzamos que el subtítulo sea undefined para comprobar que el HTML no se rompe visualmente
    const { subtitle, ...propsWithoutSubtitle } = baseProps;
    
    render(<GenericDeleteForm {...propsWithoutSubtitle} />);

    expect(screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'p' && content.includes('Estás a punto de eliminar el registro');
    })).toBeInTheDocument();
    
    // Verificamos que no se renderizan unos paréntesis huérfanos "()"
    expect(screen.queryByText(/\(\)/)).not.toBeInTheDocument();
  });

  it('3. Debe despachar los callbacks onCancel y onConfirm con el ID y tipado exactos', () => {
    render(<GenericDeleteForm {...baseProps} />);

    // Flujo A: Cancelar la operación
    fireEvent.click(screen.getByRole('button', { name: /No, Cancelar/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();

    // Flujo B: Confirmar la eliminación
    fireEvent.click(screen.getByRole('button', { name: /Sí, Eliminar/i }));
    expect(mockOnConfirm).toHaveBeenCalledWith(505); // Comprueba el ID numérico
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  // ==========================================
  // 🛑 EDGE CASES (CONCURRENCIA Y BLOQUEOS)
  // ==========================================

  it('4. Debe aplicar deshabilitación y mutar el texto del botón durante el envío (isSubmitting)', () => {
    render(<GenericDeleteForm {...baseProps} isSubmitting={true} />);

    // El botón secundario se bloquea para evitar cancelaciones tardías
    expect(screen.getByRole('button', { name: /No, Cancelar/i })).toBeDisabled();

    // El botón peligroso muta su texto por el spinner o label de carga y se congela
    const submittingBtn = screen.getByRole('button', { name: /Eliminando\.\.\./i });
    expect(submittingBtn).toBeInTheDocument();
    expect(submittingBtn).toBeDisabled();
  });

  it('5. Debe activar el cortocircuito en el submit si la petición de red ya está en marcha', () => {
    render(<GenericDeleteForm {...baseProps} isSubmitting={true} />);

    // Forzamos el submit directo sobre el elemento form (ej. pulsando la tecla ENTER)
    const formElement = screen.getByRole('heading', { name: new RegExp(baseProps.title, 'i') }).closest('form');
    fireEvent.submit(formElement!);

    // El validador 'if (isSubmitting) return;' frena la ejecución previniendo duplicados
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});