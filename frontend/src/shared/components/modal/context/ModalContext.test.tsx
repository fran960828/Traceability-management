import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ModalProvider, useModal } from './ModalContext';

// Componente de prueba para consumir el hook y exponer sus valores en la UI
const TestComponent = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();
  const location = useLocation();

  return (
    <div>
      {/* Mostramos los estados en texto para poder hacer "expect" */}
      <div data-testid="action">{activeAction || 'none'}</div>
      <div data-testid="id">{activeId || 'none'}</div>
      <div data-testid="url">{location.search}</div>

      {/* Botones para disparar las acciones */}
      <button onClick={() => openModal('create')}>Abrir Crear</button>
      <button onClick={() => openModal('edit', 125)}>Abrir Editar 125</button>
      <button onClick={() => openModal('delete', 'abc')}>Abrir Borrar abc</button>
      <button onClick={() => closeModal()}>Cerrar Modal</button>
    </div>
  );
};

describe('ModalContext (ModalProvider & useModal)', () => {
  
  // Helper para renderizar el contexto envuelto en el Router virtual
  const renderWithRouter = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <ModalProvider>
          <TestComponent />
        </ModalProvider>
      </MemoryRouter>
    );
  };

  // ==========================================
  // HAPPY PATHS
  // ==========================================

  it('debe iniciar con los valores vacíos si no hay parámetros en la URL', () => {
    renderWithRouter();

    expect(screen.getByTestId('action').textContent).toBe('none');
    expect(screen.getByTestId('id').textContent).toBe('none');
    expect(screen.getByTestId('url').textContent).toBe('');
  });

  it('debe leer correctamente los parámetros iniciales directamente de la URL', () => {
    // Simulamos que el usuario entra directamente con un enlace compartido
    renderWithRouter(['/proveedores?action=edit&id=45']);

    expect(screen.getByTestId('action').textContent).toBe('edit');
    expect(screen.getByTestId('id').textContent).toBe('45');
    expect(screen.getByTestId('url').textContent).toBe('?action=edit&id=45');
  });

  it('debe actualizar la URL y el estado al abrir un modal de creación', () => {
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: /abrir crear/i }));

    expect(screen.getByTestId('action').textContent).toBe('create');
    expect(screen.getByTestId('id').textContent).toBe('none');
    expect(screen.getByTestId('url').textContent).toBe('?action=create');
  });

  it('debe actualizar la URL y el estado al abrir un modal de edición con ID', () => {
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: /abrir editar 125/i }));

    expect(screen.getByTestId('action').textContent).toBe('edit');
    expect(screen.getByTestId('id').textContent).toBe('125');
    expect(screen.getByTestId('url').textContent).toBe('?action=edit&id=125');
  });

  it('debe limpiar todos los parámetros de la URL al cerrar el modal', () => {
    // Empezamos con el modal ya abierto en la URL
    renderWithRouter(['/?action=edit&id=125']);

    fireEvent.click(screen.getByRole('button', { name: /cerrar modal/i }));

    expect(screen.getByTestId('action').textContent).toBe('none');
    expect(screen.getByTestId('id').textContent).toBe('none');
    expect(screen.getByTestId('url').textContent).toBe('');
  });

  // ==========================================
  // EDGE CASES & ROBUSTEZ
  // ==========================================

  it('debe limpiar el ID previo si se pasa de un estado de edición a uno de creación (Edge Case)', () => {
    // Escenario: El usuario está editando y, sin cerrar, pulsa en "Nuevo"
    renderWithRouter(['/?action=edit&id=125']);

    fireEvent.click(screen.getByRole('button', { name: /abrir crear/i }));

    // El ID '125' debe ser eliminado explícitamente de la URL para evitar conflictos
    expect(screen.getByTestId('action').textContent).toBe('create');
    expect(screen.getByTestId('id').textContent).toBe('none');
    expect(screen.getByTestId('url').textContent).toBe('?action=create');
  });

  it('debe soportar IDs de tipo string correctamente', () => {
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: /abrir borrar abc/i }));

    expect(screen.getByTestId('id').textContent).toBe('abc');
    expect(screen.getByTestId('url').textContent).toBe('?action=delete&id=abc');
  });

  it('debe lanzar un error si useModal se utiliza fuera de un ModalProvider', () => {
    // Ocultamos el error en consola para que el test limpie su salida
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const BrokenComponent = () => {
      useModal(); // Esto va a petar porque no hay Provider arriba
      return null;
    };

    expect(() => {
      render(
        <MemoryRouter>
          <BrokenComponent />
        </MemoryRouter>
      );
    }).toThrow('useModal must be used within ModalProvider');

    consoleErrorSpy.mockRestore();
  });
});