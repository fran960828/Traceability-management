import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupplierDetailView } from './Supplier.detail'; // Ajusta si el nombre del archivo varía levemente
import { type Supplier } from '../../models/supplier.schema';

describe('SupplierDetailView - Integration Tests', () => {
  const mockSupplier: Supplier = {
    id: 101,
    supplier_code: 'PROV-2026-101',
    name: 'Corcho y Vidrio Ontalba',
    tax_id: 'A12345678',
    category: 2,
    category_name: 'PACKAGING',
    email_pedidos: 'pedidos@corchosontalba.es',
    phone: '611223344',
    address: 'Polígono Industrial Las Bodegas, Nave 4',
    lead_time: 1, // Probamos con 1 para validar la condición de "día" en singular
    is_active: true,
    created_at: '2026-03-15T10:15:00Z',
  };

  const mockOnEditClick = vi.fn();
  const mockOnDeleteClick = vi.fn();
  const mockOnBack = vi.fn();

  // 🛡️ Evitamos el arrastre de llamadas de tests anteriores limpiando los mocks
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Debe mapear y renderizar los datos básicos de la cabecera y el badge de estado activo', () => {
    render(
      <SupplierDetailView
        supplierData={mockSupplier}
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
        onBack={mockOnBack}
      />
    );

    // Verificaciones de cabecera usando expresiones regulares flexibles
    expect(screen.getByText(new RegExp(mockSupplier.category_name))).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: new RegExp(mockSupplier.name) })).toBeInTheDocument();
    expect(screen.getByText(mockSupplier.supplier_code)).toBeInTheDocument();
    
    // El badge de estado debe decir Activo
    const statusBadge = screen.getByText('Activo');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge.className).toContain('active');
  });

  it('2. Debe renderizar el badge de estado inactivo si la flag del proveedor viene en false', () => {
    const inactiveSupplier = { ...mockSupplier, is_active: false };
    
    render(
      <SupplierDetailView
        supplierData={inactiveSupplier}
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
        onBack={mockOnBack}
      />
    );

    const statusBadge = screen.getByText('Inactivo');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge.className).toContain('inactive');
  });

  it('3. Debe formatear de forma sutil el plazo de entrega en singular o plural', () => {
    const { rerender } = render(
      <SupplierDetailView
        supplierData={mockSupplier} // lead_time: 1
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
        onBack={mockOnBack}
      />
    );

    // Al ser 1, esperamos la salida en singular "1 día"
    expect(screen.getByText('1 día')).toBeInTheDocument();

    // Cambiamos el escenario a plural
    const pluralSupplier = { ...mockSupplier, lead_time: 4 };
    rerender(
      <SupplierDetailView
        supplierData={pluralSupplier}
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
        onBack={mockOnBack}
      />
    );

    // Al ser 4, esperamos la salida en plural "4 días"
    expect(screen.getByText('4 días')).toBeInTheDocument();
  });

  it('4. Debe parsear y formatear la fecha ISO en castellano de forma legible para el enólogo', () => {
    render(
      <SupplierDetailView
        supplierData={mockSupplier}
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
        onBack={mockOnBack}
      />
    );

    // '2026-03-15T10:15:00Z' -> se convierte en "15 de marzo de 2026"
    expect(screen.getByText(/15 de marzo de 2026/i)).toBeInTheDocument();
    // También verifica que concatena el ID de auditoría interna
    expect(screen.getByText(/ID Interno: 101/i)).toBeInTheDocument();
  });

  it('5. Debe propagar los eventos interactivos enviando los datos del proveedor al contenedor principal', () => {
    render(
      <SupplierDetailView
        supplierData={mockSupplier}
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
        onBack={mockOnBack}
      />
    );

    // A. Simulamos acción de "Volver al listado" (botón superior)
    const backBtnTop = screen.getByRole('button', { name: /Volver al listado/i });
    fireEvent.click(backBtnTop);
    expect(mockOnBack).toHaveBeenCalledTimes(1);

    // B. Simulamos acción de "Cerrar Ficha" (botón secundario inferior)
    const closeBtnBottom = screen.getByRole('button', { name: /Cerrar Ficha/i });
    fireEvent.click(closeBtnBottom);
    expect(mockOnBack).toHaveBeenCalledTimes(2); // Suma una segunda llamada

    // C. Simulamos acción de "Editar Datos"
    const editBtn = screen.getByRole('button', { name: /Editar Datos/i });
    fireEvent.click(editBtn);
    expect(mockOnEditClick).toHaveBeenCalledWith(mockSupplier);

    // D. Simulamos acción de "Eliminar Proveedor"
    const deleteBtn = screen.getByRole('button', { name: /Eliminar Proveedor/i });
    fireEvent.click(deleteBtn);
    expect(mockOnDeleteClick).toHaveBeenCalledWith(mockSupplier);
  });
});