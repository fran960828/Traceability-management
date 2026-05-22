import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FormCheckbox } from './FormCheckBox';
import { type UseFormRegisterReturn } from 'react-hook-form';

describe('FormCheckbox Component - Unit Tests', () => {
  // Simulamos las propiedades que inyecta el método register() de React Hook Form
  const mockRegister: UseFormRegisterReturn = {
    name: 'is_active',
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: vi.fn(),
  };

  it('1. Debe renderizar el texto de la etiqueta correctamente', () => {
    render(
      <FormCheckbox 
        label="Proveedor activo para compras" 
        register={mockRegister} 
      />
    );
    
    expect(screen.getByText('Proveedor activo para compras')).toBeInTheDocument();
  });

  it('2. Debe cumplir con las normas de accesibilidad asociando el Label al Checkbox por ID', () => {
    render(<FormCheckbox label="Activo" register={mockRegister} />);

    // Buscamos el elemento input de tipo checkbox a través de su etiqueta de texto
    const checkboxElement = screen.getByLabelText('Activo') as HTMLInputElement;
    
    expect(checkboxElement).toBeInTheDocument();
    expect(checkboxElement.type).toBe('checkbox');
    // El ID nativo del input debe llamarse igual que la propiedad del schema (is_active)
    expect(checkboxElement).toHaveAttribute('id', 'is_active');
  });

  it('3. Debe respetar y aplicar el estado deshabilitado (disabled)', () => {
    render(<FormCheckbox label="Casilla Bloqueada" register={mockRegister} disabled={true} />);

    const checkboxElement = screen.getByLabelText('Casilla Bloqueada');
    expect(checkboxElement).toBeDisabled();
  });

  it('4. Debe mostrar el mensaje de error de validación y aplicar la clase CSS correspondiente', () => {
    const errorMessage = 'Debes aceptar las condiciones de la bodega';
    
   render(
      <FormCheckbox 
        label="Aceptar términos" 
        register={mockRegister} 
        error={errorMessage} 
      />
    );

    // A. Verificamos que el mensaje de error se pinta en el DOM
    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    // B. Verificamos que el input adquiere la clase de error (styles.checkboxError)
    const checkboxElement = screen.getByLabelText('Aceptar términos');
    expect(checkboxElement.className).toContain('checkboxError');
  });

  it('5. Debe simular el cambio de estado (marcado/desmarcado) y notificar a React Hook Form', () => {
    render(<FormCheckbox label="Marcar estado" register={mockRegister} />);

    const checkboxElement = screen.getByLabelText('Marcar estado') as HTMLInputElement;
    
    // Por defecto el elemento simulado arranca desmarcado
    expect(checkboxElement.checked).toBe(false);

    // Simulamos el clic del usuario de la bodega
    fireEvent.click(checkboxElement);

    // A. Comprobamos que el elemento nativo cambia visualmente a true
    expect(checkboxElement.checked).toBe(true);
    
    // B. Comprobamos que el interceptor onChange de Hook Form fue llamado para procesar el valor
    expect(mockRegister.onChange).toHaveBeenCalled();
  });
});