import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnologicalForm } from './Enological.create';
import { useDataTable } from '../../../shared/hooks';
import { ENOLOGICAL_TYPES, type EnologicalMaterial } from '../../models/enological.schema';
import { UNIT_MESURE } from '../../models/label.schema';

// 1. Isolation: Aislamos el hook maestro de carga de proveedores
vi.mock('../../../shared/hooks', () => ({
  useDataTable: vi.fn(),
}));

describe('EnologicalForm - Unit & Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // Datos base simulando un estabilizante registrado en el laboratorio
  const mockEnologicalData: EnologicalMaterial = {
    id: 404,
    internal_code: 'ENO-2026-004',
    name: 'Goma Arábiga Ontalba Instante',
    supplier: 3,
    enological_type: ENOLOGICAL_TYPES.ESTABILIZANTE,
    enological_type_display: 'Estabilizantes (Gomas/Manoproteínas)',
    commercial_format: 'GARRAFA 20L',
    unit_mesure: UNIT_MESURE.LITROS,
    unit_mesure_display: 'Litros',
    min_stock_level: '100.00',
    current_stock: '450.00',
    is_low_stock: false,
    is_active: true,
    description: 'Filtrabilidad garantizada antes del embotellado',
    created_at: '2026-03-10T11:00:00Z',
    updated_at: '2026-03-10T11:00:00Z',
  };

  const mockSuppliersResponse = {
    data: {
      count: 1,
      results: [{ id: 3, name: 'Química Enológica del Duero S.L.' }],
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
  // 🟢 RENDIDERIZADO E INTERFAZ VISUAL
  // ==========================================
  
  it('1. Debe renderizar el formulario de creación en blanco con los placeholders iniciales', () => {
    render(<EnologicalForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    expect(screen.getByRole('heading', { name: /Registrar Producto Enológico/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre del Producto/i)).toHaveValue('');
    expect(screen.getByLabelText(/Formato de Envase/i)).toHaveValue('');
    expect(screen.getByLabelText(/Nivel de Stock Mínimo/i)).toHaveValue('');
    
    expect(screen.getByRole('button', { name: /Crear Producto/i })).toBeInTheDocument();
  });

  it('2. Debe hidratar todos los campos del laboratorio y mostrar metadatos en modo edición', () => {
    render(
      <EnologicalForm 
        productInitialData={mockEnologicalData}
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
        activeAction="edit" 
      />
    );

    expect(screen.getByRole('heading', { name: /Modificar Parámetros de Producto/i })).toBeInTheDocument();
    
    // Verificamos el bloque informativo de solo lectura (ReadOnly)
    expect(screen.getByText(/Código de Trazabilidad ENO/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/450.00 litros/i)).toBeInTheDocument();

    // Verificamos la carga de los inputs de datos
    expect(screen.getByLabelText(/Nombre del Producto \*/i)).toHaveValue('Goma Arábiga Ontalba Instante');
    expect(screen.getByLabelText(/Formato de Envase \*/i)).toHaveValue('GARRAFA 20L');
    
    expect(screen.getByRole('button', { name: /Actualizar Ficha/i })).toBeInTheDocument();
  });

  // ==========================================
  // 🛑 VALIDACIÓN DE REGLAS DE NEGOCIO (ZOD)
  // ==========================================

  it('3. Debe interceptar el envío e imprimir las alertas de Zod si los campos obligatorios se envían vacíos', async () => {
    render(<EnologicalForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    fireEvent.click(screen.getByRole('button', { name: /Crear Producto/i }));

    // Comprobamos que Zod detiene el submit e inyecta los mensajes configurados
    await waitFor(() => {
      expect(screen.getByText(/El nombre del producto enológico es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/El formato de envase comercial es obligatorio/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('4. Debe despachar el callback onSubmit con el payload sanitizado exacto', async () => {
    render(<EnologicalForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    // Rellenamos inputs comunes técnicos
    fireEvent.change(screen.getByLabelText(/Nombre del Producto \*/i), { target: { value: 'Ácido Cítrico Monohidratado' } });
    fireEvent.change(screen.getByLabelText(/Formato de Envase \*/i), { target: { value: 'Saco 25kg' } });
    fireEvent.change(screen.getByLabelText(/Nivel de Stock Mínimo \*/i), { target: { value: '250.00' } });

    // Rellenamos los selectores unificados
    fireEvent.change(screen.getByLabelText(/Clasificación Enológica \*/i), { target: { value: 'ACIDIFICANTE' } });
    fireEvent.change(screen.getByLabelText(/Proveedor Homologado \*/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/Unidad de Medida Balanza \*/i), { target: { value: 'KG' } });

    fireEvent.click(screen.getByRole('button', { name: /Crear Producto/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ácido Cítrico Monohidratado',
          commercial_format: 'Saco 25kg',
          min_stock_level: '250.00',
          enological_type: 'ACIDIFICANTE',
          supplier: 3,
          unit_mesure: 'KG',
          is_active: true,
          description: ''
        }),
        expect.any(Object)
      );
    });
  });

  it('5. Debe accionar el descarte operativo al pulsar Cancelar', () => {
    render(<EnologicalForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});