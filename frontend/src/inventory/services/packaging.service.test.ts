import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PackagingService } from './packaging.service';
import { apiClient } from '../../shared/adapter'; // Ajusta la ruta a tu adaptador axios
import type { PackagingFilters, PackagingFormValues } from '../models/packaging.schema';
import { PACKAGING_TYPES} from '../models/packaging.schema';
import { UNIT_MESURE } from '../models/label.schema';


// Mockeamos la instancia compartida de Axios para aislar la capa de red
vi.mock('../../shared/adapter', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('PackagingService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 🟢 HAPPY PATHS (FLUJOS DE ÉXITO)
  // ==========================================
  describe('Happy Paths', () => {
    
    it('getAll: debería solicitar el catálogo de packaging con los filtros de tipo y búsqueda inyectados', async () => {
      const mockResponse = { data: { results: [], count: 0 } };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const filters: PackagingFilters = { 
        search: 'Ontalba Botella', 
        packaging_type: PACKAGING_TYPES.VIDRIO,
        page: '1' 
      };
      
      await PackagingService.getAll(filters);

      // Verificamos la ruta correcta expuesta en Django y la inyección de los parámetros de búsqueda
      expect(apiClient.get).toHaveBeenCalledWith('inventory/packaging/', { params: filters });
    });

    it('create: debería enviar una petición POST con los datos sanitizados del material de packaging', async () => {
      const mockFormValue: PackagingFormValues = {
        name: 'Botella Ontalba Reserva Burdeos',
        supplier: 3,
        packaging_type: PACKAGING_TYPES.VIDRIO,
        specification: 'BOTELLA 75CL ALTA SELECCIÓN',
        color: 'VERDE HOJA',
        capacity: '0.750',
        unit_mesure: UNIT_MESURE.UNIDAD,
        min_stock_level: '2000.00',
        is_active: true,
        description: 'Vidrio pesado para envejecimiento prolongado'
      };

      vi.mocked(apiClient.post).mockResolvedValue({ 
        data: { id: 25, ...mockFormValue, internal_code: 'PAC-2026-025' } 
      });

      await PackagingService.create(mockFormValue);

      expect(apiClient.post).toHaveBeenCalledWith('inventory/packaging/', mockFormValue);
    });

    it('getById: debería consultar el endpoint de la instancia usando el identificador numérico', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 88, name: 'Tapón Corcho Natural' } });

      await PackagingService.getById(88);

      expect(apiClient.get).toHaveBeenCalledWith('inventory/packaging/88/');
    });

    it('update: debería ejecutar una mutación total (PUT) sobre el recurso seleccionado', async () => {
      const mockFormValue: PackagingFormValues = {
        name: 'Caja Ontalba Selección 6 botellas',
        supplier: 2,
        packaging_type: PACKAGING_TYPES.EMBALAJE,
        specification: 'CAJA CARTÓN REFORZADO CON SEPARADORES',
        color: null,
        capacity: null,
        unit_mesure: UNIT_MESURE.UNIDAD,
        min_stock_level: '500.00',
        is_active: true,
      };

      vi.mocked(apiClient.put).mockResolvedValue({ data: { id: 14, ...mockFormValue } });

      await PackagingService.update(14, mockFormValue);

      expect(apiClient.put).toHaveBeenCalledWith('inventory/packaging/14/', mockFormValue);
    });
  });

  // ==========================================
  // 🛑 EDGE CASES & ERRORES (ROBUSTEZ DE RED)
  // ==========================================
  describe('Edge Cases & Errors', () => {

    it('getAll: debería procesar la llamada de la tabla de forma limpia si no se pasan filtros', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { results: [], count: 0 } });
      
      await PackagingService.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('inventory/packaging/', { params: undefined });
    });

    it('partialUpdate: debería enviar una petición PATCH conteniendo únicamente las modificaciones del stock', async () => {
      const partialData = { min_stock_level: '4500.00' };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 5, ...partialData } });

      await PackagingService.partialUpdate(5, partialData);

      expect(apiClient.patch).toHaveBeenCalledWith('inventory/packaging/5/', partialData);
    });

    it('delete: debería propagar correctamente las excepciones de red lanzadas por Django (Ej: Código 404)', async () => {
      const mockError404 = {
        response: {
          status: 404,
          data: { detail: 'El material de acondicionamiento seleccionado no existe en el inventario.' }
        }
      };
      
      vi.mocked(apiClient.delete).mockRejectedValue(mockError404);

      try {
        await PackagingService.delete(999);
      } catch (error: any) {
        // Certificamos que el catch intercepta la firma de error nativa de Axios
        expect(error.response.status).toBe(404);
        expect(error.response.data.detail).toBe('El material de acondicionamiento seleccionado no existe en el inventario.');
      }
      
      expect(apiClient.delete).toHaveBeenCalledWith('inventory/packaging/999/');
    });
  });
});