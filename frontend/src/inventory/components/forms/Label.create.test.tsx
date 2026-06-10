import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LabelForm } from './Label.create';
import { useDataTable } from '../../../shared/hooks';
import { LABEL_TYPES, UNIT_MESURE, type LabelMaterial } from '../../models/label.schema';

// 1. Mockeamos de forma aislada el hook useDataTable que el formulario usa internamente
vi.mock('../../../shared/hooks', () => ({
  useDataTable: vi.fn(),
}));

describe('LabelForm - Unit & Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // Datos de prueba simulando una etiqueta existente en la bodega
  const mockLabelData: LabelMaterial = {
    id: 101,
    internal_code:'ETI01-2026',
    name: 'Etiqueta Frontal Tempranillo',
    supplier: 1,
    label_type: LABEL_TYPES.FRONTAL,
    label_type_display: 'Frontal',
    brand_reference: 'Ontalba Colección 2026',
    vintage: 2026,
    unit_mesure: UNIT_MESURE.UNIDAD,
    unit_mesure_display: 'Unidades',
    min_stock_level: '500.00',
    current_stock: '1200.00',
    is_low_stock: false,
    is_active: true,
    description: 'Papel rústico verjurado',
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:00:00Z',
  };

  // Mock de la respuesta paginada de proveedores para el select maestro
  const mockSuppliersResponse = {
    data: {
      count: 1,
      results: [{ id: 1, name: 'Vidrios y Etiquetas del Duero S.L.' }],
    },
    isLoading: false,
    isError: false,
    filters: {},
    updateFilters: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Por defecto, configuramos el hook useDataTable para que devuelva los proveedores maestros con éxito
    vi.mocked(useDataTable).mockReturnValue(mockSuppliersResponse as any);
  });

  // ==========================================
  // 🟢 RENDERIZADO Y FLUJOS VISUALES
  // ==========================================
  
  it('1. Debe renderizar el formulario de creación en blanco con los títulos correctos', () => {
    render(
      <LabelForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
        activeAction="create" 
      />
    );

    expect(screen.getByLabelText(/Nombre de la Etiqueta/i)).toHaveValue('');
    expect(screen.getByLabelText(/Referencia de Marca/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /Crear Etiqueta/i })).toBeInTheDocument();
  });

  it('2. Debe hidratar los campos y mostrar bloques de lectura en modo edición (edit)', () => {
    render(
      <LabelForm 
        productInitialData={mockLabelData}
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
        activeAction="edit" 
      />
    );
    // Validamos que se inyectan los campos informativos bloqueados (ReadOnly)
    expect(screen.getByText(/Código Único de Material/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/1200.00 unidades/i)).toBeInTheDocument();
    
    // El botón muta semánticamente
    expect(screen.getByRole('button', { name: /Actualizar Etiqueta/i })).toBeInTheDocument();
  });

  it('3. Debe cambiar el título y el botón pero ocultar datos técnicos previos en modo clonación (clone)', () => {
    render(
      <LabelForm 
        productInitialData={{ ...mockLabelData, name: 'COPIA - ' + mockLabelData.name }}
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
        activeAction="clone" 
      />
    );
    
    // 🛡️ CONTROL CRÍTICO: En clonación NO deben aparecer los códigos informativos del registro viejo
    expect(screen.queryByText(/Código Único de Material/i)).not.toBeInTheDocument();
    
    expect(screen.getByRole('button', { name: /Confirmar Clonación/i })).toBeInTheDocument();
  });

  // ==========================================
  // 🛑 VALIDACIÓN Y EVENTOS DE FORMULARIO
  // ==========================================

  it('4. Debe mostrar errores de validación de Zod si se intenta enviar vacío', async () => {
    render(<LabelForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitBtn = screen.getByRole('button', { name: /Crear Etiqueta/i });
    fireEvent.click(submitBtn);

    // Esperamos que Zod intercepte el árbol y pinte los mensajes de error del esquema
    await waitFor(() => {
      expect(screen.getByText(/El nombre de la etiqueta es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/La referencia de marca \(Vino\) es obligatoria/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('5. Debe disparar el evento onSubmit con el payload correcto al completar los campos requeridos', async () => {
    render(<LabelForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    // Rellenamos los campos de texto
    fireEvent.change(screen.getByLabelText(/Nombre de la Etiqueta \*/i), { target: { value: 'Etiqueta Gran Reserva' } });
    fireEvent.change(screen.getByLabelText(/Referencia de Marca/i), { target: { value: 'Ontalba Cabernet' } });
    fireEvent.change(screen.getByLabelText(/Añada/i), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText(/Nivel de Stock Mínimo/i), { target: { value: '2500.00' } });

    // Seleccionamos las opciones de los componentes selectores
    fireEvent.change(screen.getByLabelText(/Proveedor Asignado \*/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Tipo de Etiqueta \*/i), { target: { value: 'FRONTAL' } });
    fireEvent.change(screen.getByLabelText(/Unidad de Medida \*/i), { target: { value: 'UNIDAD' } });

    const submitBtn = screen.getByRole('button', { name: /Crear Etiqueta/i });
    fireEvent.click(submitBtn);

    // 🔄 CORRECCIÓN: Validamos el primer argumento de los datos e ignoramos el evento base de React
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Etiqueta Gran Reserva',
          brand_reference: 'Ontalba Cabernet',
          vintage: 2026,
          min_stock_level: '2500.00',
          supplier: 1,
          label_type: 'FRONTAL',
          unit_mesure: 'UNIDAD',
          is_active: true,
          description: '' 
        }),
        expect.any(Object) // 
      );
    });
  });

  it('6. Debe ejecutar onCancel al accionar el botón de descarte', () => {
    render(<LabelForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});