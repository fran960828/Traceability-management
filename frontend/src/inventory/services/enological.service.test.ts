import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnologicalService } from './enological.service';
import { apiClient } from '../../shared/adapter'; // Ajusta la ruta a tu adaptador axios según corresponda
import type { EnologicalFilters, EnologicalFormValues } from '../models/enological.schema';
import { ENOLOGICAL_TYPES} from '../models/enological.schema';
import { UNIT_MESURE } from '../models/label.schema';

// Mockeamos la instancia compartida de Axios para aislar por completo la capa de red
vi.mock('../../shared/adapter', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('EnologicalService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 🟢 HAPPY PATHS (FLUJOS DE ÉXITO)
  // ==========================================
  describe('Happy Paths', () => {
    
    it('getAll: debería solicitar el listado enológico con los filtros de tipo y búsqueda inyectados', async () => {
      const mockResponse = { data: { results: [], count: 0 } };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const filters: EnologicalFilters = { 
        search: 'Sulfitos Ontalba', 
        enological_type: ENOLOGICAL_TYPES.CONSERVANTE,
        page: '1' 
      };
      
      await EnologicalService.getAll(filters);

      // Verificamos la ruta correcta expuesta en Django y la inyección de los parámetros de búsqueda
      expect(apiClient.get).toHaveBeenCalledWith('inventory/enological/', { params: filters });
    });

    it('create: debería enviar una petición POST con los datos del aditivo enológico', async () => {
      const mockFormValue: EnologicalFormValues = {
        name: 'Metabisulfito potásico puro',
        supplier: 5,
        enological_type: ENOLOGICAL_TYPES.CONSERVANTE,
        commercial_format: 'SACO 25KG',
        unit_mesure: UNIT_MESURE.KILOS,
        min_stock_level: '100.00',
        is_active: true,
        description: 'Antioxidante y antimicrobiano para el mosto'
      };

      vi.mocked(apiClient.post).mockResolvedValue({ 
        data: { id: 45, ...mockFormValue, internal_code: 'ENO-2026-045' } 
      });

      await EnologicalService.create(mockFormValue);

      expect(apiClient.post).toHaveBeenCalledWith('inventory/enological/', mockFormValue);
    });

    it('getById: debería consultar el detalle del compuesto usando el identificador numérico de instancia', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 12, name: 'Goma Arábiga Líquida' } });

      await EnologicalService.getById(12);

      expect(apiClient.get).toHaveBeenCalledWith('inventory/enological/12/');
    });

    it('update: debería ejecutar una mutación total (PUT) sobre el aditivo seleccionado', async () => {
      const mockFormValue: EnologicalFormValues = {
        name: 'Ácido Tartárico Correctivo',
        supplier: 1,
        enological_type: ENOLOGICAL_TYPES.ACIDIFICANTE,
        commercial_format: 'SACO 25KG',
        unit_mesure: UNIT_MESURE.KILOS,
        min_stock_level: '500.00',
        is_active: true,
      };

      vi.mocked(apiClient.put).mockResolvedValue({ data: { id: 32, ...mockFormValue } });

      await EnologicalService.update(32, mockFormValue);

      expect(apiClient.put).toHaveBeenCalledWith('inventory/enological/32/', mockFormValue);
    });
  });

  // ==========================================
  // 🛑 EDGE CASES & ERRORES (ROBUSTEZ DE RED)
  // ==========================================
  describe('Edge Cases & Errors', () => {

    it('getAll: debería procesar la llamada de la tabla de forma limpia si no se pasan filtros', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { results: [], count: 0 } });
      
      await EnologicalService.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('inventory/enological/', { params: undefined });
    });

    it('partialUpdate: debería enviar una petición PATCH conteniendo únicamente las modificaciones del umbral de stock', async () => {
      const partialData = { min_stock_level: '250.00' };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 8, ...partialData } });

      await EnologicalService.partialUpdate(8, partialData);

      expect(apiClient.patch).toHaveBeenCalledWith('inventory/enological/8/', partialData);
    });

    it('delete: debería propagar correctamente las excepciones de red lanzadas por Django (Ej: Código 404)', async () => {
      const mockError404 = {
        response: {
          status: 404,
          data: { detail: 'El producto enológico seleccionado no existe en el inventario.' }
        }
      };
      
      vi.mocked(apiClient.delete).mockRejectedValue(mockError404);

      try {
        await EnologicalService.delete(999);
      } catch (error: any) {
        // Certificamos que el catch intercepta la firma de error nativa de Axios
        expect(error.response.status).toBe(404);
        expect(error.response.data.detail).toBe('El producto enológico seleccionado no existe en el inventario.');
      }
      
      expect(apiClient.delete).toHaveBeenCalledWith('inventory/enological/999/');
    });
  });
});