import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SupplierForm } from './Supplier.create'; // Ajusta si el nombre o ruta del archivo varía levemente
import { CategoryService } from '../../services';
import { type CategoryOption, type PaginatedResponse, type Supplier } from '../../models/supplier.schema';

// Mockear el servicio de categorías maestras
vi.mock('../../services', () => ({
  CategoryService: {
    getCategories: vi.fn(),
  },
}));

describe('SupplierForm - Deep Integration Tests', () => {
  // Inicializador de un cliente de Query aislado para cada it
  const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockCategoriesResponse:PaginatedResponse<CategoryOption> = {
    count:1,
    next:'next',
    previous:'previous',
    results: [
      { id: 1, name: 'ENOLOGICAL' },
      { id: 2, name: 'PACKAGING' },
    ],
  };

  const mockSupplier: Supplier = {
    id: 88,
    supplier_code: 'PROV-2026-088',
    name: 'Vidrierías de la Ribera',
    tax_id: 'A12345678',
    category: 2,
    category_name: 'PACKAGING',
    email_pedidos: 'pedidos@riberavidrio.es',
    phone: '654987321',
    address: 'Polígono Industrial Duero, Nave 12',
    lead_time: 7,
    is_active: true,
    created_at: '2026-04-12T09:00:00Z',
  };

  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Forzamos que por defecto el servicio de categorías devuelva nuestros datos de prueba
    vi.mocked(CategoryService.getCategories).mockResolvedValue(mockCategoriesResponse);
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('1. Debe arrancar en Modo Creación con el formulario limpio y sin secciones de solo lectura', async () => {
    renderWithProviders(
      <SupplierForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

   
    expect(screen.getByRole('button', { name: /Crear Proveedor/i })).toBeInTheDocument();

    // Comprobamos que el componente ReadOnly no pintó nada porque no hay ID ni código aún
    expect(screen.queryByLabelText(/ID Interno/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Código de Proveedor/i)).not.toBeInTheDocument();

    // Esperamos que cargue las categorías en el select
    expect(await screen.findByRole('option', { name: 'ENOLOGICAL' })).toBeInTheDocument();
  });

  it('2. Debe arrancar en Modo Edición inyectando los datos iniciales y bloqueando los campos fijos', async () => {
    renderWithProviders(
      <SupplierForm 
        supplierInitialData={mockSupplier} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    // El título y botón deben mutar semánticamente
    expect(screen.getByRole('button', { name: /Actualizar Proveedor/i })).toBeInTheDocument();

    // Comprobamos la inyección del componente de solo lectura con los valores fijos de Django
    const idInput = screen.getByLabelText(/ID Interno/i);
    const codeInput = screen.getByLabelText(/Código de Proveedor/i);
    expect(idInput).toBeDisabled();
    expect(idInput).toHaveValue('88');
    expect(codeInput).toBeDisabled();
    expect(codeInput).toHaveValue('PROV-2026-088');

    // Comprobamos que las casillas editables se han hidratado con los strings correspondientes
    expect(screen.getByLabelText(/Nombre/i)).toHaveValue('Vidrierías de la Ribera');
    expect(screen.getByLabelText(/NIF/i)).toHaveValue('A12345678');
  });

  it('3. Debe detener el envío y mostrar alertas si las validaciones del esquema de Zod fallan', async () => {
    renderWithProviders(
      <SupplierForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // Intentamos enviar el formulario completamente en blanco pulsando el botón primario
    const submitBtn = screen.getByRole('button', { name: /Crear Proveedor/i });
    fireEvent.click(submitBtn);

    // Comprobamos que Zod intercepta y React Hook Form inyecta los mensajes de error en el DOM de los inputs
    // (Ajusta las cadenas exactas que programaras en tu SupplierFormSchema si difieren levemente)
    expect(await screen.findByText(/El nombre es obligatorio/i)).toBeInTheDocument();
    
    // Validamos que el callback de envío jamás llegó a ejecutarse por seguridad
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('4. Debe tramitar y despachar un objeto válido realizando el cast correcto de datos numéricos', async () => {
    renderWithProviders(
      <SupplierForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // Rellenamos de forma simulada todos los campos requeridos mapeados por INPUTS_CONFIG
    // Simulamos que el operario de la bodega escribe en cada casilla interactiva
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Bodega Nueva S.L.' } });
    fireEvent.change(screen.getByLabelText(/NIF/i), { target: { value: 'B12345678' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'pedidos@bodeganueva.com' } });
    fireEvent.change(screen.getByLabelText(/Teléfono/i), { target: { value: '600000000' } });
    fireEvent.change(screen.getByLabelText(/Dirección/i), { target: { value: 'Calle de la Cepa 5' } });
    
    // 🚨 PRUEBA DE FUEGO: Introducimos el plazo de entrega como string en la interfaz
    fireEvent.change(screen.getByLabelText(/Plazo/i), { target: { value: '5' } });

    // Seleccionamos la categoría de la lista asíncrona
    expect(await screen.findByRole('option', { name: 'PACKAGING' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Categoría/i), { target: { value: '2' } });

    // Enviamos el formulario
    const submitBtn = screen.getByRole('button', { name: /Crear Proveedor/i });
    fireEvent.click(submitBtn);

    // React Hook Form procesa las validaciones de forma asíncrona, esperamos a que termine
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    // 🛡️ VERIFICACIÓN ARQUITECTÓNICA CLAVE: 
    // Demostramos que las directivas 'valueAsNumber: true' hicieron su trabajo.
    // Aunque el usuario escribiera texto, a la función onSubmit le debe llegar un número real.
    const dispatchedPayload = mockOnSubmit.mock.calls[0][0];
    expect(dispatchedPayload.name).toBe('Bodega Nueva S.L.');
    expect(dispatchedPayload.lead_time).toBe(5); // Tipo: number
    expect(dispatchedPayload.category).toBe(2);   // Tipo: number
    expect(dispatchedPayload.is_active).toBe(true);
  });

  it('5. Debe ejecutar onCancel al pulsar el botón secundario de cancelar', () => {
    renderWithProviders(
      <SupplierForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});