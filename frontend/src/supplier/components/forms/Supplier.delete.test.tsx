import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi,beforeEach } from 'vitest';
import { SupplierDeleteForm } from './Supplier.delete';
import { type Supplier } from '../../models/supplier.schema';

describe('SupplierDeleteForm - Integration Tests', () => {
  // Datos simulados del proveedor de prueba de la bodega
  const mockSupplier: Supplier = {
    id: 42,
    supplier_code: 'PROV-2026-042',
    name: 'Distribuciones Ontalba S.L.',
    tax_id: 'B98765432',
    category: 1,
    category_name: 'GENERIC',
    email_pedidos: 'compras@ontalba.com',
    phone: '600112233',
    address: 'Av. de los Viñedos, 14',
    lead_time: 3,
    is_active: true,
    created_at: '2026-01-10T08:30:00Z',
  };

  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Debe mostrar los datos de la advertencia y el código del proveedor correctamente', () => {
  render(
    <SupplierDeleteForm 
      supplierData={mockSupplier} 
      onConfirm={mockOnConfirm} 
      onCancel={mockOnCancel} 
    />
  );

  // Verificaciones semánticas utilizando Expresiones Regulares parciales (más robustas)
  expect(screen.getByText('¿Eliminar Proveedor?')).toBeInTheDocument();
  expect(screen.getByText(mockSupplier.name)).toBeInTheDocument();
  expect(screen.getByText(new RegExp(mockSupplier.tax_id))).toBeInTheDocument(); // 🔄 CORRECCIÓN: Busca el CIF ignore los nodos HTML vecinos
  expect(screen.getByText(mockSupplier.supplier_code)).toBeInTheDocument();
});

  it('2. Debe llamar a onConfirm pasando el ID del proveedor al hacer submit', () => {
    render(
      <SupplierDeleteForm 
        supplierData={mockSupplier} 
        onConfirm={mockOnConfirm} 
        onCancel={mockOnCancel} 
      />
    );

    const submitButton = screen.getByRole('button', { name: /Sí, Eliminar/i });
    
    // Simulamos el clic de confirmación destructiva
    fireEvent.click(submitButton);

    // Verificamos que se dispara el callback con el ID numérico exacto de Django (42)
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).toHaveBeenCalledWith(42);
  });

  it('3. Debe ejecutar onCancel al pulsar sobre el botón de cancelar', () => {
    render(
      <SupplierDeleteForm 
        supplierData={mockSupplier} 
        onConfirm={mockOnConfirm} 
        onCancel={mockOnCancel} 
      />
    );

    const cancelButton = screen.getByRole('button', { name: /No, Cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('4. Debe congelar la interfaz y deshabilitar las acciones mientras se está eliminando', () => {
  render(
    <SupplierDeleteForm 
      supplierData={mockSupplier} 
      onConfirm={mockOnConfirm} 
      onCancel={mockOnCancel} 
      isSubmitting={true} 
    />
  );

  const cancelButton = screen.getByRole('button', { name: /No, Cancelar/i });
  
  // 🔄 CORRECCIÓN: Especificamos el nombre del botón mutado para que no colisione con el de cancelar
  const submitButton = screen.getByRole('button', { name: /Eliminando.../i }); 

  // A. El botón de cancelar debe bloquearse
  expect(cancelButton).toBeDisabled();

  // B. El botón de eliminar debe estar deshabilitado y con su texto de carga
  expect(submitButton).toBeDisabled();

  // C. Intentos de clics fantasmas deben ser ignorados por seguridad
  fireEvent.click(submitButton);
  expect(mockOnConfirm).not.toHaveBeenCalled();
});
});