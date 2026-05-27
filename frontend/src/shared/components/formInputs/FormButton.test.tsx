import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FormButton } from './FormButton';

describe('FormButton Component - Unit Tests', () => {
  
  it('1. Debe renderizar el texto y contenido interno (children) correctamente', () => {
    render(<FormButton>Guardar Barrica</FormButton>);
    
    expect(screen.getByRole('button', { name: 'Guardar Barrica' })).toBeInTheDocument();
  });

  it('2. Debe aplicar los atributos nativos por defecto y los personalizados (type="submit")', () => {
    const { rerender } = render(<FormButton>Botón Base</FormButton>);
    
    // Por defecto debe ser tipo button
    let buttonElement = screen.getByRole('button');
    expect(buttonElement).toHaveAttribute('type', 'button');

    // Cambiamos dinámicamente a submit
    rerender(<FormButton type="submit">Botón Submit</FormButton>);
    buttonElement = screen.getByRole('button');
    expect(buttonElement).toHaveAttribute('type', 'submit');
  });

  it('3. Debe inyectar la clase CSS correcta basándose en la variante elegida', () => {
    const { rerender } = render(<FormButton variant="primary">Primario</FormButton>);
    let buttonElement = screen.getByRole('button');
    expect(buttonElement.className).toContain('primary');

    rerender(<FormButton variant="danger">Peligro</FormButton>);
    buttonElement = screen.getByRole('button');
    expect(buttonElement.className).toContain('danger');

    rerender(<FormButton variant="secondary">Secundario</FormButton>);
    buttonElement = screen.getByRole('button');
    expect(buttonElement.className).toContain('secondary');
  });

  it('4. Debe mutar su estado por completo cuando isLoading es verdadero', () => {
    const mockOnClick = vi.fn();
    
    render(
      <FormButton 
        isLoading={true} 
        loadingText="Enviando a Django..." 
        onClick={mockOnClick}
      >
        Crear Proveedor
      </FormButton>
    );

    const buttonElement = screen.getByRole('button');

    // A. Debe intercambiar el texto original por el de carga
    expect(buttonElement).toHaveTextContent('Enviando a Django...');
    expect(buttonElement).not.toHaveTextContent('Crear Proveedor');

    // B. Debe deshabilitar el elemento de forma nativa en el DOM
    expect(buttonElement).toBeDisabled();

    // C. Debe ignorar los clics del usuario por completo
    fireEvent.click(buttonElement);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('5. Debe mantener el texto original durante la carga si no se le pasa la prop loadingText', () => {
    render(<FormButton isLoading={true}>Actualizar Stock</FormButton>);
    
    const buttonElement = screen.getByRole('button');
    expect(buttonElement).toHaveTextContent('Actualizar Stock');
    expect(buttonElement).toBeDisabled();
  });

  it('6. Debe bloquear los clics si la prop disabled es explícitamente verdadera', () => {
    const mockOnClick = vi.fn();
    render(<FormButton disabled={true} onClick={mockOnClick}>Acción Bloqueada</FormButton>);

    const buttonElement = screen.getByRole('button');
    expect(buttonElement).toBeDisabled();

    fireEvent.click(buttonElement);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('7. Debe ejecutar la función onClick correctamente en condiciones normales', () => {
    const mockOnClick = vi.fn();
    render(<FormButton onClick={mockOnClick}>Hacer clic aquí</FormButton>);

    const buttonElement = screen.getByRole('button');
    
    // Simulamos dos clics consecutivos
    fireEvent.click(buttonElement);
    fireEvent.click(buttonElement);

    // Verificamos el contador de ejecuciones de la función espía
    expect(mockOnClick).toHaveBeenCalledTimes(2);
  });
});