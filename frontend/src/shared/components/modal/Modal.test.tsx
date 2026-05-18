import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Modal } from './Modal';

describe('Modal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    // 1. Preparamos el DOM creando el contenedor del portal antes de cada test
    const modalRoot = document.createElement('div');
    modalRoot.setAttribute('id', 'modal-root');
    document.body.appendChild(modalRoot);
    
    mockOnClose.mockClear();
  });

  afterEach(() => {
    // 2. Limpiamos el DOM y restauramos el scroll del body después de cada test
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) {
      document.body.removeChild(modalRoot);
    }
    document.body.style.overflow = 'unset';
  });

  // ==========================================
  // HAPPY PATHS (Flujos ideales)
  // ==========================================

  it('debe renderizar el título, el botón de cierre y el contenido correctamente', () => {
    render(
      <Modal title="Añadir Proveedor" onClose={mockOnClose}>
        <form data-testid="supplier-form">Contenido del Formulario</form>
      </Modal>
    );

    expect(screen.getByText('Añadir Proveedor')).toBeInTheDocument();
    expect(screen.getByTestId('supplier-form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerrar modal/i })).toBeInTheDocument();
  });

  it('debe llamar a onClose al hacer clic en el botón de la X', () => {
    render(<Modal onClose={mockOnClose}>Contenido</Modal>);

    const closeBtn = screen.getByRole('button', { name: /cerrar modal/i });
    fireEvent.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // ==========================================
  // ACCESIBILIDAD Y COMPORTAMIENTO DEL DOM
  // ==========================================

  it('debe aplicar los atributos ARIA correctos para lectores de pantalla', () => {
    render(<Modal title="Título Accesible" onClose={mockOnClose}>Contenido</Modal>);

    const dialog = screen.getByRole('dialog');
    
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(screen.getByText('Título Accesible')).toHaveAttribute('id', 'modal-title');
  });

  it('debe bloquear el scroll del body al montarse y restaurarlo al desmontarse', () => {
    // Al montarse
    const { unmount } = render(<Modal onClose={mockOnClose}>Contenido</Modal>);
    expect(document.body.style.overflow).toBe('hidden');

    // Al desmontarse
    unmount();
    expect(document.body.style.overflow).toBe('unset');
  });

  // ==========================================
  // EDGE CASES (Casos límite y UX)
  // ==========================================

  it('debe llamar a onClose al pulsar la tecla Escape', () => {
    render(<Modal onClose={mockOnClose}>Contenido</Modal>);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('no debe llamar a onClose si se pulsa cualquier otra tecla distinta a Escape', () => {
    render(<Modal onClose={mockOnClose}>Contenido</Modal>);

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('debe cerrar el modal al hacer clic en el overlay de fondo', () => {
    render(<Modal onClose={mockOnClose}>Contenido</Modal>);

    // El overlay es el contenedor con el rol 'dialog'
    const overlay = screen.getByRole('dialog');
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('no debe cerrar el modal si se hace clic dentro del contenido del modal (stopPropagation)', () => {
    render(
      <Modal onClose={mockOnClose}>
        <button data-testid="inner-content">Guardar</button>
      </Modal>
    );

    const innerContent = screen.getByTestId('inner-content');
    fireEvent.click(innerContent);

    // No debe cerrarse porque el clic fue dentro de la ventana, no en el fondo
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('no debe renderizar el botón de la X si showCloseButton es false', () => {
    render(
      <Modal onClose={mockOnClose} showCloseButton={false}>
        Contenido
      </Modal>
    );

    const closeBtn = screen.queryByRole('button', { name: /cerrar modal/i });
    expect(closeBtn).toBeNull(); // Verificamos que NO existe en el DOM
  });

  it('debe devolver null y lanzar un warning en consola si no existe "modal-root"', () => {
    // Forzamos la eliminación del nodo raíz para este test específico
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) document.body.removeChild(modalRoot);

    // Espiamos el console.warn para que no ensucie la salida del test
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { container } = render(<Modal onClose={mockOnClose}>Contenido</Modal>);

    expect(container.firstChild).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Target container 'modal-root' not found")
    );

    consoleWarnSpy.mockRestore();
  });
});