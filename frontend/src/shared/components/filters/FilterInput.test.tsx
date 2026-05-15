import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FilterInput } from './FilterInput';

describe('FilterInput Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers(); // Habilitamos cronómetros falsos
    mockOnChange.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers(); // Restauramos cronómetros reales
  });

  it('debe renderizar con el valor inicial y el label correctos (Happy Path)', () => {
    render(
      <FilterInput 
        label="Nombre" 
        name="name" 
        value="Ontalba" 
        onChange={mockOnChange} 
      />
    );

    const input = screen.getByDisplayValue('Ontalba');
    expect(input).toBeInTheDocument();
    expect(screen.getByText(/nombre/i)).toBeInTheDocument();
  });

  it('debe actualizar el valor local inmediatamente al escribir', () => {
    render(<FilterInput label="Busqueda" name="q" value="" onChange={mockOnChange} />);
    
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Vino' } });

    expect(input.value).toBe('Vino');
    // Verificamos que el cambio NO ha llegado al padre todavía
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('debe ejecutar el debounce y llamar a onChange tras 500ms (Debounce Logic)', () => {
    render(<FilterInput label="Busqueda" name="q" value="" onChange={mockOnChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Crianza' } });

    // Avanzamos el tiempo 400ms (no debería haber pasado nada)
    act(() => { vi.advanceTimersByTime(400); });
    expect(mockOnChange).not.toHaveBeenCalled();

    // Avanzamos los 100ms restantes
    act(() => { vi.advanceTimersByTime(100); });
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith({ q: 'Crianza', page: 1 });
  });

  it('debe cancelar el timer anterior si el usuario sigue escribiendo (Edge Case)', () => {
    render(<FilterInput label="Busqueda" name="q" value="" onChange={mockOnChange} />);
    
    const input = screen.getByRole('textbox');

    // El usuario escribe "V", espera 300ms, luego escribe "Vi"
    fireEvent.change(input, { target: { value: 'V' } });
    act(() => { vi.advanceTimersByTime(300); });
    
    fireEvent.change(input, { target: { value: 'Vi' } });
    act(() => { vi.advanceTimersByTime(300); });

    // En este punto han pasado 600ms totales, pero solo 300ms desde la última tecla.
    // No debería haberse llamado a la API todavía.
    expect(mockOnChange).not.toHaveBeenCalled();

    // Avanzamos 200ms más (500ms desde la última tecla)
    act(() => { vi.advanceTimersByTime(200); });
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith({ q: 'Vi', page: 1 });
  });

  it('debe sincronizar el valor local cuando la prop value cambia externamente (Sync Case)', () => {
    const { rerender } = render(
      <FilterInput label="Busqueda" name="q" value="Inicial" onChange={mockOnChange} />
    );

    // Cambiamos la prop desde fuera (ej: al pulsar "Limpiar filtros")
    rerender(<FilterInput label="Busqueda" name="q" value="" onChange={mockOnChange} />);
    
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('no debe disparar onChange si el valor es idéntico al de la URL (Efficiency Case)', () => {
    render(<FilterInput label="Busqueda" name="q" value="Ontalba" onChange={mockOnChange} />);
    
    const input = screen.getByRole('textbox');
    // Escribimos lo mismo que ya había
    fireEvent.change(input, { target: { value: 'Ontalba' } });
    
    act(() => { vi.runAllTimers(); });
    
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});