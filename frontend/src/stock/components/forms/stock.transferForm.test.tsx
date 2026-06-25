// src/stock/components/forms/__tests__/stock.transferForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockTransferForm } from './stock.transferForm';
import { useDataTable } from '../../../shared/hooks';
import { MOVEMENT_TYPE } from '../../../reception/models/';

// Aislamos únicamente el catálogo de almacenes de destino
vi.mock('../../../shared/hooks', () => ({
  useDataTable: vi.fn(),
}));

describe('StockTransferForm - Unit & Functional Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // Catálogo maestro simulado de ubicaciones de destino disponibles en la bodega
  const mockLocationsResponse = {
    results: [
      { id: 2, name: 'CÁMARA_ENOLÓGICA_A', description: 'Zona frío', is_active: true },
      { id: 5, name: 'MUELLE_PRINCIPAL', description: 'Zona carga', is_active: true },
      { id: 9, name: 'SILO_INACTIVO', description: 'Fuera de servicio', is_active: false },
    ],
  };

  // 🟢 Datos iniciales inyectados desde la fila de existencias disponibles
  const mockInitialMovementData = {
    id: 101,
    batch: 12,
    batch_number: 'LOT-2026-E01',
    product_name: 'Levadura Seleccionada',
    location: 2, // ID de CÁMARA_ENOLÓGICA_A
    location_name: 'CÁMARA_ENOLÓGICA_A',
    quantity: '500.000',
    movement_type: MOVEMENT_TYPE.IN,
    movement_type_display: 'Entrada (Compra/Recepciones)',
    reference_po: 50,
    user: 1,
    user_full_name: 'Operador 1',
    created_at: '2026-06-19T00:00:00Z',
    notes: 'Entrada inicial',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDataTable).mockImplementation(({ key }) => {
      if (key === 'locations-transfer-select') {
        return { data: mockLocationsResponse, isLoading: false, isError: false } as any;
      }
      return { data: null, isLoading: false, isError: false } as any;
    });
  });

  // ===================================================
  // 🟢 TEST 1: RENDERIZADO E HIDRATACIÓN INMEDIATA
  // ===================================================
  it('1. Debe hidratar la meta-card informativa de forma estática usando el contexto de la fila', () => {
    render(
      <StockTransferForm 
        initialMovementData={mockInitialMovementData} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    expect(screen.getByRole('heading', { name: /Transferencia de Material entre Ubicaciones/i })).toBeInTheDocument();

    // Verificación de los datos fijos del lote a trasladar
    expect(screen.getByText('Levadura Seleccionada')).toBeInTheDocument();
    expect(screen.getByText('LOT-2026-E01')).toBeInTheDocument();
    expect(screen.getByText('500.000 uds')).toBeInTheDocument(); // 🟢 Precisión de 3 decimales verificada
  });

  // ===================================================
  // 🚷 TEST 2: REGLA DE FILTRADO DE ALMACENES INACTIVOS
  // ===================================================
  it('2. Debe renderizar las zonas de destino activas y omitir aquellas fuera de servicio', () => {
    render(
      <StockTransferForm 
        initialMovementData={mockInitialMovementData} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    // Las ubicaciones activas deben aparecer como opciones del select
    expect(screen.getByText('MUELLE_PRINCIPAL')).toBeInTheDocument();

    // 🟢 REGLA DE NEGOCIO: 'SILO_INACTIVO' (is_active: false) no debe existir en el select
    expect(screen.queryByText('SILO_INACTIVO')).not.toBeInTheDocument();
  });

  // ===================================================
  // 🛑 TEST 3: VALIDACIÓN CRUZADA ESTRUCTURAL (SAME-ZONE)
  // ===================================================
  it('3. Debe detener la sumisión si el operario selecciona el mismo destino que el origen actual', async () => {
    render(
      <StockTransferForm 
        initialMovementData={mockInitialMovementData} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    // Intentamos seleccionar el mismo destino (CÁMARA_ENOLÓGICA_A - value: '2')
    const destinationSelect = screen.getByRole('combobox', { name: /Ubicación de Destino \*/i });
    fireEvent.change(destinationSelect, { target: { value: '2' } });

    fireEvent.change(screen.getByRole('spinbutton', { name: /Cantidad a Mover \*/i }), { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Movimiento Interno/i }));

    // El validador Zod .refine() intercepta e impide la llamada al submit
    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // ===================================================
  // 🚀 TEST 4: HAPPY PATH Y CONVENIO DE PAYLOAD LIMPIO
  // ===================================================
  it('4. Debe compilar y tipar los datos en los formatos planos esperados por el StockTransferSerializer', async () => {
    render(
      <StockTransferForm 
        initialMovementData={mockInitialMovementData} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    // 1. Destino válido (MUELLE_PRINCIPAL - value: '5')
    fireEvent.change(screen.getByRole('combobox', { name: /Ubicación de Destino \*/i }), { target: { value: '5' } });
    
    // 2. Cantidad a mover (Convertido internamente a número por react-hook-form)
    fireEvent.change(screen.getByRole('spinbutton', { name: /Cantidad a Mover \*/i }), { target: { value: '250' } });
    
    // 3. Notas adicionales
    fireEvent.change(screen.getByRole('textbox', { name: /Notas de la Operación/i }), { 
      target: { value: 'Traslado rutinario a muelle' } 
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Movimiento Interno/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    // Verificación final del payload plano
    const payload = mockOnSubmit.mock.calls[0][0];
    expect(payload).toEqual({
      batch: 12,
      origin_location: 2,
      destination_location: 5, // Coercionado correctamente a número
      quantity: 250,
      notes: 'Traslado rutinario a muelle',
    });
  });

  // ===================================================
  // 🟢 TEST 5: CALLBACk ONCANCEL
  // ===================================================
  it('5. Debe gatillar el callback onCancel al presionar Cancelar Traslado', () => {
    render(
      <StockTransferForm 
        initialMovementData={mockInitialMovementData} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancelar Traslado/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});