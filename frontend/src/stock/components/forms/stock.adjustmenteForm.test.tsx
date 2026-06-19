import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockAdjustmentForm } from './stock.adjustmentForm';
import { useDataTable } from '../../../shared/hooks';
import { MOVEMENT_TYPE } from '../../../reception/models';

// Aislamos el hook useDataTable
vi.mock('../../../shared/hooks', () => ({
  useDataTable: vi.fn(),
}));

describe('StockAdjustmentForm - Unit & Functional Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // Catálogo maestro simulado de ubicaciones activas de la bodega
  const mockLocationsResponse = {
    results: [
      { id: 2, name: 'CÁMARA_ENOLÓGICA_A', description: 'Zona frío', is_active: true },
      { id: 3, name: 'SILO_EMBOTELLADO', description: 'Línea de envasado', is_active: true },
    ],
  };

  // Histórico de movimientos simulado para inferir lotes existentes
  const mockMovementsResponse = {
    results: [
      {
        id: 201,
        batch: 14,
        batch_number: 'LOT-2026-X45',
        product_name: 'Ácido Tartárico',
        location: '2',
        location_name: 'CÁMARA_ENOLÓGICA_A',
        quantity: '150.000',
        movement_type: MOVEMENT_TYPE.IN,
        reference_po: 42,
        user: 1,
        user_full_name: 'Enólogo de Guardia',
        created_at: '2026-06-19T08:00:00Z',
        notes: 'Entrada de muelle',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDataTable).mockImplementation(({ key }) => {
      if (key === 'locations-adjustment-select') {
        return { data: mockLocationsResponse, isLoading: false, isError: false } as any;
      }
      if (key === 'movements-adjustment-batch') {
        return { data: mockMovementsResponse, isLoading: false, isError: false } as any;
      }
      return { data: null, isLoading: false, isError: false } as any;
    });
  });

  // ===================================================
  // 🟢 TEST 1: RENDERIZADO E HIDRATACIÓN
  // ===================================================
  it('1. Debe cargar los catálogos de almacén y renderizar la interfaz de auditoría correctamente', () => {
    render(<StockAdjustmentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByRole('heading', { name: /Ajuste de Inventario y Mermas/i })).toBeInTheDocument();
    
    // El selector de lotes debe estar disponible
    expect(screen.getByRole('combobox', { name: /Seleccionar Lote de Insumo \*/i })).toBeInTheDocument();
  });

  // ===================================================
  // 🔄 TEST 2: AUTO-DETECCIÓN DE ENTORNO (useWatch)
  // ===================================================
  it('2. Debe fijar la ubicación del lote de forma reactiva y mostrar el stock actual de auditoría', async () => {
    render(<StockAdjustmentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const batchSelect = screen.getByRole('combobox', { name: /Seleccionar Lote de Insumo \*/i }) as HTMLSelectElement;
    fireEvent.change(batchSelect, { target: { value: '14' } });

    // Esperamos a que useWatch y el useEffect asienten el valor en el DOM readOnly
    await waitFor(() => {
      const locationSelect = screen.getByRole('combobox', { name: /Ubicación de Origen \(Auto-detectada\)/i }) as HTMLSelectElement;
      expect(locationSelect.value).toBe('2');
    });

    // Validamos la inyección del texto de ayuda visual con los estilos modulares corporativos
    expect(screen.getByText(/Existencias actuales en esta zona:/i)).toBeInTheDocument();
    expect(screen.getByText(/150 uds/i)).toBeInTheDocument();
  });

  // ===================================================
  // 🛑 TEST 3: INTERCEPCIÓN DE CANTIDAD CERO (0) Y NOTAS CORTAS
  // ===================================================
  it('3. Debe bloquear la sumisión si la cantidad es cero o si el informe de justificación no cumple los caracteres mínimos', async () => {
    render(<StockAdjustmentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Seleccionamos lote
    fireEvent.change(screen.getByRole('combobox', { name: /Seleccionar Lote de Insumo \*/i }), { target: { value: '14' } });

    // Rellenamos cantidad errónea (0) y justificación insuficiente
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cantidad del Movimiento \*/i }), { target: { value: '0' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Justificación Obligatoria del Ajuste/i }), { target: { value: 'Mala' } }); // 4 caracteres (Zod exige mín. 5)

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Ajuste de Stock/i }));

    // El validador detiene la sumisión
    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // ===================================================
  // 🚀 TEST 4: COMPROBACIÓN HAPPY PATH CON SIGNO NEGATIVO (MERMA)
  // ===================================================
  it('4. Debe compilar las mermas negativas de forma nativa y despachar el payload limpio para la API de Django', async () => {
    render(<StockAdjustmentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // 1. Selección de lote primario
    fireEvent.change(screen.getByRole('combobox', { name: /Seleccionar Lote de Insumo \*/i }), { target: { value: '14' } });

    await waitFor(() => {
      const locationSelect = screen.getByRole('combobox', { name: /Ubicación de Origen \(Auto-detectada\)/i }) as HTMLSelectElement;
      expect(locationSelect.value).toBe('2');
    });

    // 2. Introducimos una merma física (ej: -25 unidades por rotura de saco)
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cantidad del Movimiento \*/i }), { target: { value: '-25' } });
    
    // 3. Justificación reglamentaria de auditoría
    fireEvent.change(screen.getByRole('textbox', { name: /Justificación Obligatoria del Ajuste/i }), { 
      target: { value: 'Merma por rotura accidental de saco durante transporte interno' } 
    });

    // 4. Envío
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Ajuste de Stock/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    // Verificación final del contrato de salida (Output)
    const payload = mockOnSubmit.mock.calls[0][0];
    expect(payload).toEqual({
      batch: 14,
      location: 2,
      quantity: -25, // Preserva el signo negativo para impactar stock_dispose o adjustment
      notes: 'Merma por rotura accidental de saco durante transporte interno',
    });
  });

  // ===================================================
  // 🟢 TEST 5: DISPARO DE CANCELAR
  // ===================================================
  it('5. Debe gatillar el callback onCancel de forma limpia al presionar Cancelar Operación', () => {
    render(<StockAdjustmentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /Cancelar Operación/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});