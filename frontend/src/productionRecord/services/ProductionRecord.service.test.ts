import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/adapter';
import { ProductionService } from './productionRecord.service';
import type { ProductionOrderOutput, ProductionOrderFilters } from '../models/productionRecord.schema';

// 🔹 Mockeamos el adaptador central de red de la aplicación
vi.mock('../../shared/adapter', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ProductionService - Unit & Endpoint Integration Tests', () => {
  // Mocks estáticos de datos para simular respuestas del backend de Django
  const mockOrderResponse = {
    id: 1,
    lot_number: 'L26-001',
    wine: 10,
    wine_name: 'Ontalba Tempranillo Crianza',
    quantity_produced: 1500,
    status: 'DRAFT',
    status_display: 'Borrador',
    bulk_liters_withdrawn: '1125.000',
    total_liters: '1125.000',
    loss_liters: '0.000',
    loss_percentage: 0.0,
    notes: 'Embotellado ordinario',
    enological_materials: [],
    created_at: '2026-06-25T14:00:00Z',
  };

  const mockPaginatedResponse = {
    count: 1,
    next: null,
    previous: null,
    results: [mockOrderResponse],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================
  // 📋 ESCENARIOS DE TEST: getAll
  // ========================================================
  describe('getAll() - Listado de Partes de Producción', () => {
    it('Debe listar partes de producción con éxito sin filtros adicionales', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockPaginatedResponse });

      const result = await ProductionService.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('production/orders/', { params: undefined });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('UX Premium - Debe sanear y purgar los filtros ignorando cadenas vacías, nulos o indefinidos', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockPaginatedResponse });

      const dirtyFilters: ProductionOrderFilters = {
        page: '2',
        wine: '10',
        status: '', // Cadena vacía (Debe purgarse)
        date_from: undefined, // Indefinido (Debe purgarse)
      };

      await ProductionService.getAll(dirtyFilters);

      expect(apiClient.get).toHaveBeenCalledWith('production/orders/', {
        params: {
          page: '2',
          wine: '10', // Solo viajan las propiedades con contenido real
        },
      });
    });

    it('Debe propagar el error si la llamada de red falla por falta de conectividad', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network Error'));

      await expect(ProductionService.getAll()).rejects.toThrow('Network Error');
    });
  });

  // ========================================================
  // 🔍 ESCENARIOS DE TEST: getById
  // ========================================================
  describe('getById() - Ficha Técnica Individual', () => {
    it('Debe recuperar los detalles de un parte por su ID con éxito', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockOrderResponse });

      const result = await ProductionService.getById(1);

      expect(apiClient.get).toHaveBeenCalledWith('production/orders/1/');
      expect(result).toEqual(mockOrderResponse);
    });
  });

  // ========================================================
  // 📝 ESCENARIOS DE TEST: create
  // ========================================================
  describe('create() - Apertura de Borradores', () => {
    it('Debe despachar correctamente el payload para crear un parte en borrador', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockOrderResponse });

      const newOrderPayload: ProductionOrderOutput = {
        wine: 10,
        production_date: '2026-06-25',
        quantity_produced: 1500,
        lot_number: 'L26-001',
        bulk_liters_withdrawn: 1125,
        notes: 'Borrador inicial',
        enological_materials: [],
      };

      const result = await ProductionService.create(newOrderPayload);

      expect(apiClient.post).toHaveBeenCalledWith('production/orders/', newOrderPayload);
      expect(result).toEqual(mockOrderResponse);
    });
  });

  // ========================================================
  // 🔄 ESCENARIOS DE TEST: update
  // ========================================================
  describe('update() - Modificación de Datos Básicos', () => {
    it('Debe despachar los datos mutados a través del método PUT en el endpoint correcto', async () => {
      vi.mocked(apiClient.put).mockResolvedValueOnce({ data: mockOrderResponse });

      const updatePayload: ProductionOrderOutput = {
        wine: 10,
        production_date: '2026-06-25',
        quantity_produced: 1600, // Variación de cantidad
        lot_number: 'L26-001',
        bulk_liters_withdrawn: 1200,
        notes: 'Ajuste de volumen líquido',
        enological_materials: [],
      };

      const result = await ProductionService.update(1, updatePayload);

      expect(apiClient.put).toHaveBeenCalledWith('production/orders/1/', updatePayload);
      expect(result).toEqual(mockOrderResponse);
    });
  });

  // ========================================================
  // ❌ ESCENARIOS DE TEST: delete
  // ========================================================
  describe('delete() - Purga de Registros', () => {
    it('Debe invocar de manera atómica el verbo DELETE contra la ID del recurso en Django', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({});

      await ProductionService.delete(1);

      expect(apiClient.delete).toHaveBeenCalledWith('production/orders/1/');
    });
  });

  // ========================================================
  // 🚀 ESCENARIOS DE TEST: confirm
  // ========================================================
  describe('confirm() - Transición de Cierre y Cómputo FIFO', () => {
    it('Debe invocar la acción especial de confirmación y devolver la orden actualizada', async () => {
      const confirmedOrderMock = { ...mockOrderResponse, status: 'CONFIRMED', status_display: 'Confirmado (Stock descontado)' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: confirmedOrderMock });

      const result = await ProductionService.confirm(1);

      expect(apiClient.post).toHaveBeenCalledWith('production/orders/1/confirm/');
      expect(result.status).toBe('CONFIRMED');
    });
  });

  // ========================================================
  // 🛑 ESCENARIOS DE TEST: cancel
  // ========================================================
  describe('cancel() - Anulación de Operaciones', () => {
    it('Debe llamar al endpoint de anulación de Django y retornar la respuesta de éxito', async () => {
      const serverMessage = { detail: 'Orden cancelada.' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: serverMessage });

      const result = await ProductionService.cancel(1);

      expect(apiClient.post).toHaveBeenCalledWith('production/orders/1/cancel/');
      expect(result).toEqual(serverMessage);
    });
  });

  // ========================================================
  // 👥 ESCENARIOS DE TEST: getClonePrefill
  // ========================================================
  describe('getClonePrefill() - Prefiltrado Estructural para Duplicados', () => {
    it('Debe consultar la pre-carga del clon devolviendo los datos estructurales limpios de la orden', async () => {
      const clonedPrefillMock = { ...mockOrderResponse, lot_number: '', production_date: '', status: 'DRAFT' };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: clonedPrefillMock });

      const result = await ProductionService.getClonePrefill(1);

      expect(apiClient.get).toHaveBeenCalledWith('production/orders/1/clone-prefill/');
      expect(result.status).toBe('DRAFT');
      expect(result.lot_number).toBe('');
    });
  });
});