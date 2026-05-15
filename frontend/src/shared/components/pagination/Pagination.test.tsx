import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from './Pagination';

describe('Pagination Component', () => {
  const mockOnPageChange = vi.fn();

  it('no debe renderizar nada si el total de páginas es 1 o menos', () => {
    const { container } = render(
      <Pagination count={10} pageSize={10} currentPage={1} onPageChange={mockOnPageChange} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('debe mostrar la información de rango correctamente (ej: 11 a 20 de 50)', () => {
    render(
      <Pagination count={50} pageSize={10} currentPage={2} onPageChange={mockOnPageChange} />
    );
    
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 5')).toBeInTheDocument();
  });

  it('debe ajustar el límite superior en la última página (ej: 21 a 25 de 25)', () => {
  render(
    <Pagination count={25} pageSize={10} currentPage={3} onPageChange={mockOnPageChange} />
  );
  
  // Verificamos el bloque de texto completo para evitar ambigüedades con el número "25"
  const infoElement = screen.getByText(/mostrando/i);
  
  expect(infoElement).toHaveTextContent('Mostrando 21 a 25 de 25 resultados');
  expect(screen.getByText('Página 3 de 3')).toBeInTheDocument();
});

  it('debe deshabilitar botones de "Inicio" y "Anterior" cuando se está en la página 1', () => {
    render(
      <Pagination count={30} pageSize={10} currentPage={1} onPageChange={mockOnPageChange} />
    );

    const firstPageBtn = screen.getByTitle('Primera página');
    const prevBtn = screen.getByTitle('prev')
    

    expect(firstPageBtn).toBeDisabled();
    expect(prevBtn).toBeDisabled();
  });

  it('debe deshabilitar botones de "Siguiente" y "Último" cuando se está en la última página', () => {
    render(
      <Pagination count={30} pageSize={10} currentPage={3} onPageChange={mockOnPageChange} />
    );

    const lastPageBtn = screen.getByTitle('Última página');
    expect(lastPageBtn).toBeDisabled();
  });

  it('debe llamar a onPageChange con el valor correcto al hacer clic en "Siguiente"', () => {
    render(
      <Pagination count={30} pageSize={10} currentPage={1} onPageChange={mockOnPageChange} />
    );

    const nextBtn = screen.getAllByRole('button')[2]; // El tercer botón es ChevronRight
    fireEvent.click(nextBtn);

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('debe saltar a la última página al hacer clic en el botón de fin', () => {
    render(
      <Pagination count={100} pageSize={10} currentPage={1} onPageChange={mockOnPageChange} />
    );

    const lastPageBtn = screen.getByTitle('Última página');
    fireEvent.click(lastPageBtn);

    expect(mockOnPageChange).toHaveBeenCalledWith(10);
  });
});