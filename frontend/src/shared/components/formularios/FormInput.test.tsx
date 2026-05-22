import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FormInput } from './FormInput';
import { type UseFormRegisterReturn } from 'react-hook-form';

describe('FormInput Component - Unit Tests', () => {
  // Mock base que simula el comportamiento que React Hook Form inyecta con el método register()
  const mockRegister: UseFormRegisterReturn = {
    name: 'test_field',
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: vi.fn(),
  };

  it('1. Debe renderizar el label y el placeholder correctamente', () => {
    render(
      <FormInput 
        label="Nombre del Proveedor" 
        placeholder="Ej: Vidrios del Duero" 
        register={mockRegister} 
      />
    );

    // Verificamos que el label y el input con su placeholder están en el DOM
    expect(screen.getByText('Nombre del Proveedor')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej: Vidrios del Duero')).toBeInTheDocument();
  });

  it('2. Debe cumplir con las normas de accesibilidad asociando el Label al Input mediante el ID', () => {
    render(<FormInput label="NIF / CIF" register={mockRegister} />);

    // Buscamos el input a través de su Label de forma semántica
    const inputElement = screen.getByLabelText('NIF / CIF');
    
    expect(inputElement).toBeInTheDocument();
    // Verificamos que el ID nativo coincide con el name del register
    expect(inputElement).toHaveAttribute('id', 'test_field');
  });

  it('3. Debe aplicar el tipo de input nativo correcto (ej: password, number, tel)', () => {
    render(<FormInput label="Contraseña" type="password" register={mockRegister} />);

    const inputElement = screen.getByLabelText('Contraseña');
    expect(inputElement).toHaveAttribute('type', 'password');
  });

  it('4. Debe mostrar el mensaje de error y aplicar la clase CSS correspondiente si existe un fallo', () => {
    const errorMessage = 'Este campo es completamente obligatorio';
    
    render(
      <FormInput 
        label="Email" 
        register={mockRegister} 
        error={errorMessage} 
      />
    );

    // A. Comprobamos que el texto del error de Zod se dibuja en pantalla
    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    // B. Comprobamos que el input adquirió la clase visual de error (styles.inputError)
    const inputElement = screen.getByLabelText('Email');
    expect(inputElement.className).toContain('inputError');
  });

  it('5. Debe renderizar componentes secundarios (children) como el botón del ojo en campos de contraseña', () => {
    render(
      <FormInput label="Contraseña" type="password" register={mockRegister}>
        <button data-testid="eye-button" type="button">👁️</button>
      </FormInput>
    );

    // Verificamos que el input de contraseña convive felizmente con el botón inyectado
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByTestId('eye-button')).toBeInTheDocument();
  });

  it('6. Debe propagar los eventos nativos de React Hook Form (onChange)', async () => {
    render(<FormInput label="Nombre" register={mockRegister} />);
    
    const inputElement = screen.getByLabelText('Nombre');
    
    // Simulamos que el usuario de la bodega escribe en la casilla
    fireEvent.change(inputElement, { target: { value: 'Ontalba Bodega' } });
    
    // Verificamos que la función espía onChange que inyecta Hook Form fue notificada
    expect(mockRegister.onChange).toHaveBeenCalled();
  });
});