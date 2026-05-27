import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FormSelect, type SelectOption } from './FormSelect';
import { type UseFormRegisterReturn } from 'react-hook-form';

describe('FormSelect Component - Unit Tests', () => {
  const mockRegister: UseFormRegisterReturn = {
    name: 'category',
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: vi.fn(),
  };

  const mockOptions: SelectOption[] = [
    { id: 1, name: 'ENOLOGICAL' },
    { id: 2, name: 'LABELS' },
    { id: 3, name: 'PACKAGING' },
  ];

  it('1. Debe renderizar el label y el placeholder por defecto correctamente', () => {
    render(<FormSelect label="Categoría *" options={[]} register={mockRegister} />);

    expect(screen.getByText('Categoría *')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Selecciona una opción...' })).toBeInTheDocument();
  });

  it('2. Debe mutar visualmente y bloquearse cuando isLoading es verdadero', () => {
    render(<FormSelect label="Categoría" options={mockOptions} register={mockRegister} isLoading={true} />);

    const selectElement = screen.getByLabelText('Categoría');
    
    // A. El elemento select nativo debe estar inhabilitado
    expect(selectElement).toBeDisabled();

    // B. El texto de la opción por defecto debe indicar que está cargando
    expect(screen.getByRole('option', { name: 'Cargando opciones...' })).toBeInTheDocument();
  });

  it('3. Debe renderizar e iterar el array de opciones correctamente', () => {
    render(<FormSelect label="Categoría" options={mockOptions} register={mockRegister} />);

    // Capturamos todas las opciones renderizadas dentro del select
    const optionElements = screen.getAllByRole('option');

    // Esperamos 4 opciones: El placeholder + las 3 del array de mockOptions
    expect(optionElements).toHaveLength(4);
    
    // Verificamos que los valores nativos (id) e internos (name) cuadran perfectamente
    expect(optionElements[1]).toHaveAttribute('value', '1');
    expect(optionElements[1]).toHaveTextContent('ENOLOGICAL');
    expect(optionElements[3]).toHaveAttribute('value', '3');
    expect(optionElements[3]).toHaveTextContent('PACKAGING');
  });

  it('4. Debe mostrar el mensaje de error y aplicar la clase CSS correspondiente', () => {
    const errorMessage = 'La categoría es un campo obligatorio';
    render(<FormSelect label="Categoría" options={mockOptions} error={errorMessage} register={mockRegister} />);

    // A. Verificamos el texto de error de Zod
    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    // B. Verificamos la inyección de la clase CSS de error
    const selectElement = screen.getByLabelText('Categoría');
    expect(selectElement.className).toContain('inputError');
  });

  it('5. Debe respetar el estado deshabilitado explícito (disabled)', () => {
    render(<FormSelect label="Categoría" options={mockOptions} disabled={true} register={mockRegister} />);

    const selectElement = screen.getByLabelText('Categoría');
    expect(selectElement).toBeDisabled();
  });

  it('6. Debe procesar la selección del usuario y enviar el evento a React Hook Form', () => {
    render(<FormSelect label="Categoría" options={mockOptions} register={mockRegister} />);

    const selectElement = screen.getByLabelText('Categoría') as HTMLSelectElement;

    // Inicialmente el valor del select debe ser el string vacío (placeholder)
    expect(selectElement.value).toBe('');

    // Simulamos que el usuario de la bodega cambia el select a la opción 'LABELS' (id: 2)
    fireEvent.change(selectElement, { target: { value: '2' } });

    // A. Comprobamos que el elemento nativo mutó al ID correcto
    expect(selectElement.value).toBe('2');

    // B. Comprobamos que el cable interno onChange de Hook Form fue notificado con éxito
    expect(mockRegister.onChange).toHaveBeenCalled();
  });
});