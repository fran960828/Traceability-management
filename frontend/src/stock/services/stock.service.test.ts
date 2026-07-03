import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/adapter';
import { StockService } from './stock.service';
import { MOVEMENT_TYPE } from '../../reception/models';
import type { 
  StockMovementPaginationResponse, 
  StockMovement, 
  StockTransferOutput, 
  StockAdjustmentOutput 
} from '../models/stock.schema';

// Aislamos por completo el adaptador de red de Axios
vi.mock('../../shared/adapter', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('StockService - Comprehensive Unit Tests', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================================================
  // 📋 ESCENARIO 1: StockService.getAll
  // ===================================================
  describe('getAll() - Histórico Diario de Almacén', () => {
    const mockPaginationResponse: StockMovementPaginationResponse = {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 101,
          batch: 12,
          batch_number: 'LOT-2026-E01',
          batch_current_stock:'12',
          product_name: 'Levadura Enológica Crianza',
          location: 2,
          location_name: 'Cámara Enológica A',
          quantity: '50.000',
          movement_type: MOVEMENT_TYPE.IN,
          movement_type_display:'Entrada',
          reference_po: 50,
          user: 1,
          user_full_name: 'Operador Muelle 01',
          created_at: '2026-06-18T10:00:00Z',
          notes: 'Recepción inicial'
        }
      ]
    };

    it('🎯 Happy Path: Debe recuperar el histórico paginado aplicando los query params de filtrado', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginationResponse });

      const filters = { movement_type: 'IN', location: '2', date_from: '2026-06-01' };
      const result = await StockService.getAll(filters);

      expect(apiClient.get).toHaveBeenCalledWith('stock/movements/', { params: filters });
      expect(result).toEqual(mockPaginationResponse);
      expect(result.results[0].movement_type).toBe(MOVEMENT_TYPE.IN);
    });

    it('❌ Unhappy Path: Debe propagar el error si el backend de Django falla (ej: 500 Interno)', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Internal Server Error'));

      await expect(StockService.getAll()).rejects.toThrow('Internal Server Error');
    });
  });

  // ===================================================
  // 🔍 ESCENARIO 2: StockService.getById
  // ===================================================
  describe('getById() - Trazabilidad Unitaria de Auditoría', () => {
    const mockMovement: StockMovement = {
      id: 102,
      batch: 15,
      batch_number: 'LOT-2026-P05',
      batch_current_stock:'15',
      product_name: 'Botella Bordelesa Elite',
      location: 3,
      location_name: 'Silo Embotellado',
      quantity: '-1200.000',
      movement_type: MOVEMENT_TYPE.OUT,
      movement_type_display: 'Salida',
      reference_po: null,
      user: 2,
      user_full_name: 'Responsable Línea Corchos',
      created_at: '2026-06-18T12:30:00Z',
      notes: 'Consumo embotellado lote tinto'
    };

    it('🎯 Happy Path: Debe recuperar la ficha técnica de auditoría de un movimiento específico por ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockMovement });

      const result = await StockService.getById(102);

      expect(apiClient.get).toHaveBeenCalledWith('stock/movements/102/');
      expect(result).toEqual(mockMovement);
      expect(Number(result.quantity)).toBeLessThan(0); // Validamos consistencia de signo OUT
    });

    it('❌ Unhappy Path: Debe lanzar una excepción si el movimiento no existe (404 Not Found)', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Request failed with status code 404'));

      await expect(StockService.getById(999)).rejects.toThrow('Request failed with status code 404');
    });
  });

  // ===================================================
  // 🔄 ESCENARIO 3: StockService.transfer
  // ===================================================
  describe('transfer() - Transferencias entre Ubicaciones Bodegueras', () => {
    const payload: StockTransferOutput = {
      batch: 12,
      origin_location: 2,
      destination_location: 5,
      quantity: 500,
      notes: 'Traslado preventivo a cámara de frío'
    };

    it('🎯 Happy Path: Debe ejecutar la transferencia atómica masiva y retornar el detalle de éxito', async () => {
      const mockBackendResponse = { detail: 'Transferencia completada.' };
      vi.mocked(apiClient.post).mockResolvedValue({ data: mockBackendResponse });

      const result = await StockService.transfer(payload);

      expect(apiClient.post).toHaveBeenCalledWith('stock/movements/transfer/', payload);
      expect(result).toEqual(mockBackendResponse);
    });

    it('❌ Unhappy Path: Debe capturar el error de negocio de Django si hay insuficiencia de existencias (400 Bad Request)', async () => {
      const mockValidationError = {
        response: {
          status: 400,
          data: { quantity: 'Stock insuficiente en Cámara Enológica A. Disponible: 200, Intentado: 500' }
        }
      };
      vi.mocked(apiClient.post).mockRejectedValue(mockValidationError);

      await expect(StockService.transfer(payload)).rejects.toEqual(mockValidationError);
    });
  });

  // ===================================================
  // ⚠️ ESCENARIO 4: StockService.adjustment
  // ===================================================
  describe('adjustment() - Ajustes Manuales de Auditoría de Stock', () => {
    const payload: StockAdjustmentOutput = {
      batch: 14,
      location: 2,
      quantity: -15, // Descuadre físico por rotura de sacos
      notes: 'Merma por rotura física en estantería'
    };

    it('🎯 Happy Path: Debe guardar el ajuste de inventario y retornar el registro inmutable con su ID autogenerado', async () => {
      const mockCreatedMovement: StockMovement = {
        id: 105,
        ...payload,
        quantity: '-15.000',
        batch_number: 'LOT-2026-E02',
        batch_current_stock:'0',
        product_name: 'Ácido Tartárico',
        location_name: 'Cámara Enológica A',
        movement_type: MOVEMENT_TYPE.ADJUSTMENT,
        movement_type_display:'Ajuste',
        reference_po: null,
        user: 1,
        user_full_name: 'Enólogo Principal',
        created_at: '2026-06-18T15:45:00Z'
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCreatedMovement });

      const result = await StockService.adjustment(payload);

      expect(apiClient.post).toHaveBeenCalledWith('stock/movements/adjustment/', payload);
      expect(result).toEqual(mockCreatedMovement);
      expect(result.movement_type).toBe(MOVEMENT_TYPE.ADJUSTMENT);
    });

    it('❌ Unhappy Path: Debe rechazar la sumisión si el serializador detecta cantidad cero (0)', async () => {
      const mockZeroError = {
        response: {
          status: 400,
          data: { quantity: ['La cantidad no puede ser cero.'] }
        }
      };
      vi.mocked(apiClient.post).mockRejectedValue(mockZeroError);

      await expect(StockService.adjustment({ ...payload, quantity: 0 })).rejects.toEqual(mockZeroError);
    });
  });
});