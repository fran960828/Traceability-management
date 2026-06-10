import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PackagingForm } from './Packaging.create';
import { useDataTable } from '../../../shared/hooks';
import { PACKAGING_TYPES, type PackagingMaterial } from '../../models/packaging.schema';
import { UNIT_MESURE } from '../../models/label.schema';

// 1. Isolation: Mock del hook maestro para la carga de proveedores
vi.mock('../../../shared/hooks', () => ({
  useDataTable: vi.fn(),
}));

describe('PackagingForm - Unit & Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // Datos base simulando una botella de vidrio registrada en la bodega
  const mockPackagingData: PackagingMaterial = {
    id: 303,
    internal_code: 'PAC-2026-003',
    name: 'Botella Vidrio Élite Bordelesa',
    supplier: 2,
    packaging_type: PACKAGING_TYPES.VIDRIO,
    packaging_type_display: 'Vidrio (Botellas)',
    specification: 'BOTELLA 75CL ALTA SELECCIÓN',
    color: 'VERDE HOJA',
    capacity: '0.750',
    unit_mesure: UNIT_MESURE.UNIDAD,
    unit_mesure_display: 'Unidades',
    min_stock_level: '2500.00',
    current_stock: '15000.00',
    is_low_stock: false,
    is_active: true,
    description: 'Paletizado especial de alta resistencia',
    created_at: '2026-02-15T08:30:00Z',
    updated_at: '2026-02-15T08:30:00Z',
  };

  const mockSuppliersResponse = {
    data: {
      count: 1,
      results: [{ id: 2, name: 'Vidrieras del Mediterráneo S.A.' }],
    },
    isLoading: false,
    isError: false,
    filters: {},
    updateFilters: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDataTable).mockReturnValue(mockSuppliersResponse as any);
  });

  // ==========================================
  // 🟢 RENDERIZADO Y CONDICIONALES DINÁMICOS
  // ==========================================
  
  it('1. Debe renderizar el formulario de creación en blanco con campos fijos iniciales', () => {
    render(<PackagingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    expect(screen.getByLabelText(/Nombre del Material/i)).toHaveValue('');
    expect(screen.getByLabelText(/Especificación Técnica/i)).toHaveValue('');
    
    // Al no haber seleccionado tipo, los condicionales no deben saturar el DOM
    expect(screen.queryByLabelText(/Capacidad Nominal/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Color del Material/i)).not.toBeInTheDocument();
    
    expect(screen.getByRole('button', { name: /Crear Material/i })).toBeInTheDocument();
  });

  it('2. Debe hidratar todos los campos (incluidos condicionales) y mostrar bloques de lectura en modo edición', () => {
    render(
      <PackagingForm 
        productInitialData={mockPackagingData}
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
        activeAction="edit" 
      />
    );
    
    // Comprobamos la inyección del componente de solo lectura
    expect(screen.getByText(/Código PAC Técnico/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/15000.00 unidades/i)).toBeInTheDocument();

    // Al ser tipo VIDRIO, se activan los inputs condicionales y se rellenan automáticamente
    expect(screen.getByLabelText(/Capacidad Nominal/i)).toHaveValue('0.750');
    expect(screen.getByLabelText(/Color del Material/i)).toHaveValue('VERDE HOJA');
    
    expect(screen.getByRole('button', { name: /Actualizar Propiedades/i })).toBeInTheDocument();
  });

  it('3. 🔄 CRÍTICO (Opción A): Debe mutar dinámicamente el DOM al alterar el Tipo de Material', async () => {
    render(<PackagingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    const selectType = screen.getByLabelText(/Tipo de Material \*/i);

    // Escenario A: Seleccionamos VIDRIO -> Deben aparecer tanto capacidad como color
    fireEvent.change(selectType, { target: { value: 'VIDRIO' } });
    expect(screen.getByLabelText(/Capacidad Nominal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Color del Material/i)).toBeInTheDocument();

    // Escenario B: Cambiamos a CAPSULA -> Solo requiere color, la capacidad se retira del DOM
    fireEvent.change(selectType, { target: { value: 'CAPSULA' } });
    expect(screen.queryByLabelText(/Capacidad Nominal/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Color del Material/i)).toBeInTheDocument();

    // Escenario C: Cambiamos a EMBALAJE (Cajas) -> No requiere ninguno de los dos campos
    fireEvent.change(selectType, { target: { value: 'EMBALAJE' } });
    expect(screen.queryByLabelText(/Capacidad Nominal/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Color del Material/i)).not.toBeInTheDocument();
  });

  // ==========================================
  // 🛑 VALIDACIÓN Y CAPTURA DE PAYLOADS
  // ==========================================

  it('4. Debe interceptar el envío e imprimir los errores de Zod si los campos obligatorios están ausentes', async () => {
    render(<PackagingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    fireEvent.click(screen.getByRole('button', { name: /Crear Material/i }));

   await waitFor(() => {
      expect(screen.getByText(/El nombre del material es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/La especificación técnica es obligatoria/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('5. Debe despachar el onSubmit con la firma exacta de datos requerida por drf-spectacular', async () => {
    render(<PackagingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    // Rellenamos inputs comunes estáticos
    fireEvent.change(screen.getByLabelText(/Nombre del Material \*/i), { target: { value: 'Corcho Natural Gran Reserva' } });
    fireEvent.change(screen.getByLabelText(/Especificación Técnica \*/i), { target: { value: '44x24mm corcho flor' } });
    fireEvent.change(screen.getByLabelText(/Nivel de Stock Mínimo \*/i), { target: { value: '5000.00' } });

    // Rellenamos selectores mapeados
    fireEvent.change(screen.getByLabelText(/Tipo de Material \*/i), { target: { value: 'CIERRE' } });
    fireEvent.change(screen.getByLabelText(/Proveedor Fabricante \*/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Unidad de Medida \*/i), { target: { value: 'UNIDAD' } });

    fireEvent.click(screen.getByRole('button', { name: /Crear Material/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Corcho Natural Gran Reserva',
          specification: '44x24mm corcho flor',
          min_stock_level: '5000.00',
          packaging_type: 'CIERRE',
          supplier: 2,
          unit_mesure: 'UNIDAD',
          is_active: true,
          description: '',
          // Al ser tipo CIERRE, color y capacidad viajan vacíos/nulos respetando las superRefines de Zod
          color: '',
          capacity: ''
        }),
        expect.any(Object)
      );
    });
  });

  it('6. Debe activar el callback de cancelación onCancel al accionar el descarte', () => {
    render(<PackagingForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});