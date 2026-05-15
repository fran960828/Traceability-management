import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterSelect } from './FilterSelect';

describe('FilterSelect Component', () => {
  const mockOnChange = vi.fn();
  const options = [
    { id: 1, name: 'Nacional' },
    { id: 2, name: 'Exportación' },
  ];

  it('debe renderizar con las opciones y el valor inicial correctos (Happy Path)', () => {
    render(
      <FilterSelect 
        label="Tipo" 
        name="type" 
        value={1} 
        options={options} 
        onChange={mockOnChange} 
      />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    
    expect(screen.getByText(/tipo/i)).toBeInTheDocument();
    expect(select.value).toBe('1'); // Los selectores de HTML siempre tratan el valor como string
    expect(screen.getByText('Nacional')).toBeInTheDocument();
    expect(screen.getByText('Exportación')).toBeInTheDocument();
  });

  it('debe llamar a onChange con el ID correcto al seleccionar una opción', () => {
    render(
      <FilterSelect 
        label="Tipo" 
        name="type" 
        value="" 
        options={options} 
        onChange={mockOnChange} 
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2' } });

    expect(mockOnChange).toHaveBeenCalledWith({ type: '2', page: 1 });
  });

  it('debe mostrar "Cargando..." y deshabilitarse cuando isLoading es true (Loading State)', () => {
    render(
      <FilterSelect 
        label="Tipo" 
        name="type" 
        value="" 
        options={[]} 
        onChange={mockOnChange} 
        isLoading={true} 
      />
    );

    const select = screen.getByRole('combobox');
    
    expect(select).toBeDisabled();
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('debe permitir volver a la opción "Todos" (vacía)', () => {
    render(
      <FilterSelect 
        label="Tipo" 
        name="type" 
        value={2} 
        options={options} 
        onChange={mockOnChange} 
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '' } });

    expect(mockOnChange).toHaveBeenCalledWith({ type: '', page: 1 });
  });

  it('debe estar deshabilitado si la prop disabled es true (Edge Case)', () => {
    render(
      <FilterSelect 
        label="Tipo" 
        name="type" 
        value="" 
        options={options} 
        onChange={mockOnChange} 
        disabled={true} 
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });
});