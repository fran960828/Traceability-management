import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WineForm } from './wines.create';
import { useDataTable } from '../../../shared/hooks';
import { type WineMaterial, APPELLATION_TYPES, WINE_TYPES, AGING_CATEGORIES } from '../../models/wines.schema';

// 1. Isolation: Mockeamos de forma aislada el hook maestro del Shared
vi.mock('../../../shared/hooks', () => ({
  useDataTable: vi.fn(),
}));

describe('WineForm - Unit & Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // Ficha técnica base de un vino simulado de Ontalba
  const mockWineInitialData: WineMaterial = {
    id: 77,
    internal_code: 'WN-2026-077',
    name: 'ONTALBA MONASTRELL CRITICAL',
    vintage: 2026,
    appellation_type: APPELLATION_TYPES.DOP,
    appellation_type_display: 'DENOMINACIÓN DE ORIGEN PROTEGIDA',
    appellation_name: 'JUMILLA',
    wine_type: WINE_TYPES.TINTO,
    wine_type_display: 'TINTO',
    aging_category: AGING_CATEGORIES.CRIANZA,
    aging_category_display: 'CRIANZA',
    varietals: '100% Monastrell Pesada',
    alcohol_percentage: '14.50',
    is_active: true,
    default_container: '10',
    default_cork: '20',
    default_capsule: '30',
    default_front_label: '40',
    default_back_label: '41',
    default_dop_seal: '42',
    created_at:'2026-10-12',
    updated_at:'2026-10-12',
    
  };

  // Mocks específicos para simular las dos llamadas paralelas de useDataTable
  const mockPackagingResponse = {
    results: [
      { id: 10, name: 'Botella Bordelesa Élite', packaging_type: 'VIDRIO', specification: '75cl' },
      { id: 20, name: 'Corcho Natural Flor', packaging_type: 'CIERRE' },
      { id: 30, name: 'Cápsula Alumite', packaging_type: 'CAPSULA' },
    ],
  };

  const mockLabelsResponse = {
    results: [
      { id: 40, name: 'Frontal Ontalba', label_type: 'FRONTAL', vintage: 2026 },
      { id: 41, name: 'Contra Ontalba', label_type: 'CONTRA', vintage: 2026 },
      { id: 42, name: 'Tirilla Consejo Regulador', label_type: 'TIRILLA', vintage: 2026 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Lógica dinámica de Mocking: Identificamos qué catálogo pide el componente en base al hook key
    vi.mocked(useDataTable).mockImplementation((config: any) => {
      if (config.key === 'packaging-selects') {
        return { data: mockPackagingResponse, isLoading: false, isError: false } as any;
      }
      if (config.key === 'labels-selects') {
        return { data: mockLabelsResponse, isLoading: false, isError: false } as any;
      }
      return { data: { results: [] }, isLoading: false, isError: false } as any;
    });
  });

  // ==========================================
  // 🟢 RENDERIZADO Y FLUJOS VISUALES
  // ==========================================
  
  it('1. Debe renderizar el formulario en blanco con agrupaciones técnicas legibles', () => {
    render(<WineForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    expect(screen.getByRole('heading', { name: /Registrar Nuevo Vino/i })).toBeInTheDocument();
    
    // 🔄 CORRECCIÓN: Sincronizamos las strings exactas de los encabezados <h3>
    expect(screen.getByText('Datos Técnicos del Vino')).toBeInTheDocument();
    expect(screen.getByText('Configuración del Escandallo (Materiales por Defecto)')).toBeInTheDocument();
    
    expect(screen.getByLabelText(/Nombre Comercial del Vino/i)).toHaveValue('');
    expect(screen.getByLabelText(/Variedades de Uva/i)).toHaveValue('');
  });

  it('2. Debe hidratar todos los campos descriptivos y de escandallo en modo edición (edit)', () => {
    render(
      <WineForm 
        productInitialData={mockWineInitialData}
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
        activeAction="edit" 
      />
    );

    expect(screen.getByRole('heading', { name: /Modificar Ficha de Vino/i })).toBeInTheDocument();
    expect(screen.getByText(/Código Único WN/i)).toBeInTheDocument();
    
    expect(screen.getByLabelText(/Nombre Comercial del Vino/i)).toHaveValue('ONTALBA MONASTRELL CRITICAL');
    expect(screen.getByLabelText(/Grado Alcohólico/i)).toHaveValue('14.50');
    
    // 🔄 CORRECCIÓN: Ajustamos el texto del label y evaluamos los valores del select como strings
    expect(screen.getByLabelText(/Envase Principal \/ Botella \*/i)).toHaveValue('10');
    expect(screen.getByLabelText(/Tipo de Cierre /i)).toHaveValue('20');
  });

  it('3. Debe conmutar los títulos pero ocultar identificadores técnicos previos en modo clonación (clone)', () => {
    render(
      <WineForm 
        productInitialData={{ ...mockWineInitialData, name: 'COPIA - ONTALBA' }}
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
        activeAction="clone" 
      />
    );

    expect(screen.getByRole('heading', { name: /Clonar Ficha de Vino/i })).toBeInTheDocument();
    expect(screen.queryByText(/Código Único WN/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar Nueva Añada/i })).toBeInTheDocument();
  });

  // ==========================================
  // 🛑 VALIDACIONES DE NEGOCIO EN CASCADA
  // ==========================================

  it('4. Debe interceptar el submit e imprimir las advertencias de Zod si los campos obligatorios están ausentes', async () => {
    render(<WineForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    fireEvent.click(screen.getByRole('button', { name: /Crear Ficha de Vino/i }));

    await waitFor(() => {
      expect(screen.getByText(/El nombre del vino es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/El nombre de la denominación es obligatorio/i)).toBeInTheDocument();
      expect(screen.getByText(/Debes indicar las variedades de uva utilizadas/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('5. Debe despachar el callback onSubmit con la estructura limpia esperada por drf-spectacular', async () => {
    render(<WineForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} activeAction="create" />);

    // Rellenamos inputs descriptivos
    fireEvent.change(screen.getByLabelText(/Nombre Comercial del Vino \*/i), { target: { value: 'ONTALBA SELECCIÓN SYRAH' } });
    fireEvent.change(screen.getByLabelText(/Añada/i), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText(/Nombre de la D.O./i), { target: { value: 'MANCHUELA' } });
    fireEvent.change(screen.getByLabelText(/Grado Alcohólico/i), { target: { value: '14.00' } });
    fireEvent.change(screen.getByLabelText(/Variedades de Uva/i), { target: { value: '100% Syrah Ecológico' } });

    // Seleccionamos Enums de clasificación
    fireEvent.change(screen.getByLabelText(/Mención de Calidad \*/i), { target: { value: 'DOP' } });
    fireEvent.change(screen.getByLabelText(/Tipo de Vino \*/i), { target: { value: 'TINTO' } });
    fireEvent.change(screen.getByLabelText(/Categoría de Envejecimiento \*/i), { target: { value: 'ROBLE' } });

    // Seleccionamos IDs de materiales del Escandallo
    fireEvent.change(screen.getByLabelText(/Envase Principal \/ Botella \*/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Tipo de Cierre/i), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(/Cápsula de Botella/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/Etiqueta Frontal Asignada/i), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText(/Contraetiqueta Asignada/i), { target: { value: '41' } });
    fireEvent.change(screen.getByLabelText(/Precinto \/ Tirilla DOP/i), { target: { value: '42' } });

    fireEvent.click(screen.getByRole('button', { name: /Crear Ficha de Vino/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ONTALBA SELECCIÓN SYRAH',
          vintage: 2026,
          appellation_type: 'DOP',
          appellation_name: 'MANCHUELA',
          wine_type: 'TINTO',
          aging_category: 'ROBLE',
          varietals: '100% Syrah Ecológico',
          alcohol_percentage: '14.00',
          default_container: '10',
          default_cork: '20',
          default_capsule: '30',
          default_front_label: '40',
          default_back_label: '41',
          default_dop_seal: '42',
          is_active: true,
        }),
        expect.any(Object)
      );
    });
  });

  it('6. Debe disparar la acción de descarte onCancel al pulsar Cancelar', () => {
    render(<WineForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});