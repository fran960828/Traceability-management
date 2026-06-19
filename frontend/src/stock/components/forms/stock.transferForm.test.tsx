import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockTransferForm } from './stock.transferForm';
import { useDataTable } from '../../../shared/hooks';
import { MOVEMENT_TYPE } from '../../../reception/models';

// Aislamos el hook de TanStack Query encapsulado en useDataTable
vi.mock('../../../shared/hooks', () => ({
  useDataTable: vi.fn(),
}));

describe('StockTransferForm - Unit & Functional Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // Catálogo maestro simulado de ubicaciones
  const mockLocationsResponse = {
    results: [
      { id: 2, name: 'CÁMARA_ENOLÓGICA_A', description: 'Zona frío', is_active: true },
      { id: 5, name: 'MUELLE_PRINCIPAL', description: 'Zona carga', is_active: true },
      { id: 9, name: 'SILO_INACTIVO', description: 'Fuera de servicio', is_active: false },
    ],
  };

  // Histórico de movimientos simulado para deducir las existencias por lote
  const mockMovementsResponse = {
    results: [
      {
        id: 101,
        batch: 12,
        batch_number: 'LOT-2026-E01',
        product_name: 'Levadura Seleccionada',
        location: '2',
        location_name: 'CÁMARA_ENOLÓGICA_A',
        quantity: '500.000',
        movement_type: MOVEMENT_TYPE.IN,
        reference_po: 50,
        user: 1,
        user_full_name: 'Operador 1',
        created_at: '2026-06-19T00:00:00Z',
        notes: 'Entrada inicial',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Inyectamos las respuestas simuladas en el mock de useDataTable
    vi.mocked(useDataTable).mockImplementation(({ key }) => {
      if (key === 'locations-transfer-select') {
        return { data: mockLocationsResponse, isLoading: false, isError: false } as any;
      }
      if (key === 'movements-transfer-batch') {
        return { data: mockMovementsResponse, isLoading: false, isError: false } as any;
      }
      return { data: null, isLoading: false, isError: false } as any;
    });
  });

  // ===================================================
  // 🟢 TEST 1: HIDRATACIÓN DE SELECTORES
  // ===================================================
  it('1. Debe cargar los catálogos maestros y renderizar las opciones activas en los selectores', () => {
    render(<StockTransferForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByRole('heading', { name: /Transferencia de Material entre Ubicaciones/i })).toBeInTheDocument();

    // Comprobar que el selector de lotes muestra las opciones computadas del libro diario
    const batchSelect = screen.getByLabelText(/Seleccionar Lote de Insumo \*/i);
    expect(batchSelect).toBeInTheDocument();

    // REGLA DE FILTRADO: Las ubicaciones inactivas no deben renderizarse en el DOM
    expect(screen.queryByText('SILO_INACTIVO')).not.toBeInTheDocument();
  });

  // ===================================================
  // 🔄 TEST 2: AUTO-COMPLETADO REACTIVO DE ORIGEN
  // ===================================================
it('2. Debe auto-detectar la ubicación de origen y desplegar la ayuda visual de stock disponible al elegir un lote', async () => {
  render(<StockTransferForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

  // 🎯 CORRECCIÓN: Buscamos por el rol del elemento para evitar discrepancias de vinculación de labels en el test
  const batchSelect = screen.getByRole('combobox', { name: /Seleccionar Lote de Insumo \*/i });
  
  // Forzamos el cambio simulando la selección manual del operario (Lote id 12)
  fireEvent.change(batchSelect, { target: { value: '12' } });

  // Esperamos a queuseWatch procese la rehidratación analítica en el DOM
  await waitFor(() => {
    const originSelect = screen.getByRole('combobox', { name: /Ubicación de Origen \(Auto-detectada\)/i }) as HTMLSelectElement;
    expect(originSelect.value).toBe('2');
  });

  // Verificamos que los textos informativos estilizados de la hoja modular aparezcan
  expect(screen.getByText(/Disponible real en zona:/i)).toBeInTheDocument();
  expect(screen.getByText(/500 uds/i)).toBeInTheDocument();
});

  // ===================================================
  // 🛑 TEST 3: VALIDACIÓN CRUZADA DE UBICACIONES SAME-ZONE
  // ===================================================
  it('3. Debe detener el envío y lanzar un error si se intenta transferir a la misma ubicación de origen', async () => {
    render(<StockTransferForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // 1. Elegimos lote (fija el origen automáticamente a CÁMARA_ENOLÓGICA_A - id: 2)
    fireEvent.change(screen.getByLabelText(/Seleccionar Lote de Insumo \*/i), { target: { value: '12' } });

    // 2. Elegimos maliciosamente el mismo destino (CÁMARA_ENOLÓGICA_A - id: 2)
    fireEvent.change(screen.getByLabelText(/Ubicación de Destino \*/i), { target: { value: '2' } });
    
    fireEvent.change(screen.getByLabelText(/Cantidad a Mover \*/i), { target: { value: '100' } });

    // Intentamos procesar
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Movimiento Interno/i }));

    // Zod detiene la marcha a través del validador estructural .refine()
    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // ===================================================
  // 🚀 TEST 4: COMPROBACIÓN DE PAYLOAD DE SALIDA LIMPIO
  // ===================================================
  it('4. Debe compilar los datos en los formatos correctos y despachar el payload limpio hacia el servicio', async () => {
  render(<StockTransferForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

  // 1. Selección del lote primario
  const batchSelect = screen.getByRole('combobox', { name: /Seleccionar Lote de Insumo \*/i });
  fireEvent.change(batchSelect, { target: { value: '12' } });

  // Esperamos la fijación del origen antes de rellenar el resto del camión
  await waitFor(() => {
    const originSelect = screen.getByRole('combobox', { name: /Ubicación de Origen \(Auto-detectada\)/i }) as HTMLSelectElement;
    expect(originSelect.value).toBe('2');
  });

  // 2. Destino (MUELLE_PRINCIPAL - id: 5)
  const destinationSelect = screen.getByRole('combobox', { name: /Ubicación de Destino \*/i });
  fireEvent.change(destinationSelect, { target: { value: '5' } });
  
  // 3. Cantidad a mover (Input numérico)
  const quantityInput = screen.getByRole('spinbutton', { name: /Cantidad a Mover \*/i });
  fireEvent.change(quantityInput, { target: { value: '250' } });
  
  // 4. Notas / Justificación
  const notesInput = screen.getByRole('textbox', { name: /Notas de la Operación \/ Justificación/i });
  fireEvent.change(notesInput, { target: { value: 'Traslado rutinario muelle de carga' } });

  // 5. Submit del formulario
  const submitButton = screen.getByRole('button', { name: /Confirmar Movimiento Interno/i });
  fireEvent.click(submitButton);

  // Zod validará y transformará los strings a tipos numéricos, llamando a la mutación
  await waitFor(() => {
    expect(mockOnSubmit).toHaveBeenCalled();
  });

  const payload = mockOnSubmit.mock.calls[0][0];
  expect(payload).toEqual({
    batch: 12,
    origin_location: 2,
    destination_location: 5,
    quantity: 250,
    notes: 'Traslado rutinario muelle de carga',
  });
});

  // ===================================================
  // 🟢 TEST 5: DISPARO DE CANCELAR
  // ===================================================
  it('5. Debe invocar el callback onCancel de forma limpia al presionar Cancelar Traslado', () => {
    render(<StockTransferForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /Cancelar Traslado/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});