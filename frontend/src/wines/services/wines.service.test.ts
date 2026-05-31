import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WineService } from './wines.service';
import { apiClient } from '../../shared/adapter'; // Ajusta la ruta a tu adaptador axios según corresponda
import type { WineFilters, WineFormValues } from '../models/wines.schema';
import { APPELLATION_TYPES, WINE_TYPES, AGING_CATEGORIES } from '../models/wines.schema';

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

describe('WineService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 🟢 HAPPY PATHS (FLUJOS EXITOSOS)
  // ==========================================
  describe('Happy Paths', () => {
    
    it('getAll: debería solicitar el listado con los filtros de añada y tipo de vino mapeados correctamente', async () => {
      const mockResponse = { data: { results: [], count: 0 } };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const filters: WineFilters = { 
        search: 'Ontalba Selección', 
        wine_type: WINE_TYPES.TINTO, 
        vintage: '2026',
        page: '1' 
      };
      
      await WineService.getAll(filters);

      // Verificamos el prefijo de la URL de vinos y los parámetros inyectados en la Query
      expect(apiClient.get).toHaveBeenCalledWith('wines/wines/', { params: filters });
    });

    it('create: debería enviar un POST al endpoint técnico con el payload de la ficha del vino', async () => {
      const mockFormValue: WineFormValues = {
        name: 'ONTALBA COLECCIÓN PRIVADA',
        vintage: 2026,
        appellation_type: APPELLATION_TYPES.DOP,
        appellation_name: 'JUMILLA',
        wine_type: WINE_TYPES.TINTO,
        aging_category: AGING_CATEGORIES.RESERVA,
        varietals: 'Monastrell 60%, Syrah 40%',
        alcohol_percentage: '14.50',
        is_active: true,
        default_container: 12,  // ID Botella Vidrio
        default_cork: 5,        // ID Corcho Natural
        default_front_label: 22,// ID Frontal 2026
        default_back_label: 23, // ID Contra 2026
        default_dop_seal: 8,    // ID Tirilla Consejo Regulador
        default_capsule: 14     // ID Cápsula Negra
      };

      vi.mocked(apiClient.post).mockResolvedValue({ 
        data: { id: 10, ...mockFormValue, internal_code: 'WN-2026-010' } 
      });

      await WineService.create(mockFormValue);

      expect(apiClient.post).toHaveBeenCalledWith('wines/wines/', mockFormValue);
    });

    it('clone: debería llamar al método GET del endpoint de clonación para preparar el borrador', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 11, name: 'COPIA - ONTALBA', is_active: true } });

      // Ejecutamos la clonación sobre el vino con ID 75
      await WineService.clone(75);

      // Django CloneMixin espera un GET a la ruta de la instancia /id/clone-prefill/
      expect(apiClient.get).toHaveBeenCalledWith('wines/wines/75/clone-prefill/');
    });
  });

  // ==========================================
  // 🛑 EDGE CASES & ERRORES (ROBUSTEZ DE RED)
  // ==========================================
  describe('Edge Cases & Errors', () => {

    it('getAll: debería procesar la llamada con éxito aunque no se le pasen parámetros', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { results: [], count: 0 } });
      
      await WineService.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('wines/wines/', { params: undefined });
    });

    it('partialUpdate: debería enviar una petición PATCH conteniendo únicamente los campos modificados', async () => {
      const partialData = { is_active: false };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 1, name: 'Base Wine', ...partialData } });

      await WineService.partialUpdate(1, partialData);

      expect(apiClient.patch).toHaveBeenCalledWith('wines/wines/1/', partialData);
    });

    it('delete: debería propagar y capturar los errores de servidor (Ej: Código 404 Not Found)', async () => {
      const mockError404 = {
        response: {
          status: 404,
          data: { detail: 'La ficha de vino seleccionada no existe.' }
        }
      };
      
      vi.mocked(apiClient.delete).mockRejectedValue(mockError404);

      try {
        await WineService.delete(999);
      } catch (error: any) {
        // Validamos que el catch intercepta la estructura estándar del interceptor de Axios
        expect(error.response.status).toBe(404);
        expect(error.response.data.detail).toBe('La ficha de vino seleccionada no existe.');
      }
      
      expect(apiClient.delete).toHaveBeenCalledWith('wines/wines/999/');
    });
  });
});