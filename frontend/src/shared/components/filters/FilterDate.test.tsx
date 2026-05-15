import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi,beforeEach } from 'vitest';
import { FilterDateRange } from './FilterDate';

describe('FilterDateRange Component', () => {
  const mockOnChange = vi.fn();
  const baseName = 'created_at';
  
  // Nombres esperados según nuestra convención con Django
  const gteName = `${baseName}__gte`;
  const lteName = `${baseName}__lte`;
  beforeEach(() => {
    // Esto limpia el historial de llamadas del espía
    mockOnChange.mockClear();
  });
  it('debe renderizar con los valores iniciales correctos (Happy Path)', () => {
    const values = {
      [gteName]: '2024-01-01',
      [lteName]: '2024-01-31',
    };

    const { container } = render(
      <FilterDateRange 
        label="Rango de Fechas" 
        baseName={baseName} 
        values={values} 
        onChange={mockOnChange} 
      />
    );

    const inputs = container.querySelectorAll('input');
    
    expect(screen.getByText(/rango de fechas/i)).toBeInTheDocument();
    expect(inputs[0].value).toBe('2024-01-01');
    expect(inputs[1].value).toBe('2024-01-31');
  });

  it('debe llamar a onChange con el sufijo __gte al cambiar la fecha de inicio', () => {
    const { container } = render(
      <FilterDateRange 
        label="Fecha" 
        baseName={baseName} 
        values={{}} 
        onChange={mockOnChange} 
      />
    );

    const startInput = container.querySelectorAll('input')[0];
    fireEvent.change(startInput, { target: { value: '2024-05-01' } });

    expect(mockOnChange).toHaveBeenCalledWith({ 
      [gteName]: '2024-05-01', 
      page: 1 
    });
  });

  it('debe llamar a onChange con el sufijo __lte al cambiar la fecha de fin', () => {
    const { container } = render(
      <FilterDateRange 
        label="Fecha" 
        baseName={baseName} 
        values={{}} 
        onChange={mockOnChange} 
      />
    );

    const endInput = container.querySelectorAll('input')[1];
    fireEvent.change(endInput, { target: { value: '2024-05-20' } });

    expect(mockOnChange).toHaveBeenCalledWith({ 
      [lteName]: '2024-05-20', 
      page: 1 
    });
  });

  it('debe enviar "undefined" al limpiar una fecha (Edge Case)', () => {
    const values = { [gteName]: '2024-01-01' };
    const { container } = render(
      <FilterDateRange 
        label="Fecha" 
        baseName={baseName} 
        values={values} 
        onChange={mockOnChange} 
      />
    );

    const startInput = container.querySelectorAll('input')[0];
    fireEvent.change(startInput, { target: { value: '' } });

    expect(mockOnChange).toHaveBeenCalledWith({ 
      [gteName]: undefined, 
      page: 1 
    });
  });

  it('debe renderizar campos vacíos si no hay valores en el objeto de filtros', () => {
    const { container } = render(
      <FilterDateRange 
        label="Fecha" 
        baseName={baseName} 
        values={{}} 
        onChange={mockOnChange} 
      />
    );

    const inputs = container.querySelectorAll('input');
    expect(inputs[0].value).toBe('');
    expect(inputs[1].value).toBe('');
  });
  it('no debe llamar a onChange si la fecha fin es anterior a la fecha inicio', () => {
    // 1. Renderizamos con una fecha de inicio ya establecida
    const { container } = render(
      <FilterDateRange 
        label="Fecha" 
        baseName={baseName} 
        values={{ [`${baseName}__gte`]: '2024-05-10' }} 
        onChange={mockOnChange} 
      />
    );

    const endInput = container.querySelectorAll('input')[1];

    // 2. Intentamos poner una fecha de fin anterior (el día 5)
    fireEvent.change(endInput, { target: { value: '2024-05-05' } });

    // 3. Verificamos que NO se ha llamado a onChange
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('no debe llamar a onChange si la fecha inicio es posterior a la fecha fin', () => {
    const { container } = render(
      <FilterDateRange 
        label="Fecha" 
        baseName={baseName} 
        values={{ [`${baseName}__lte`]: '2024-05-10' }} 
        onChange={mockOnChange} 
      />
    );

    const startInput = container.querySelectorAll('input')[0];

    // Intentamos poner una fecha de inicio posterior (el día 15)
    fireEvent.change(startInput, { target: { value: '2024-05-15' } });

    expect(mockOnChange).not.toHaveBeenCalled();
  });
});