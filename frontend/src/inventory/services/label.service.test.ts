import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LabelService } from './label.service'; // Ajusta la ruta a tu archivo de servicio
import { apiClient } from '../../shared/adapter'; // Ajusta la ruta a tu adaptador axios
import type { LabelFilters, LabelFormValues } from '../models/label.schema';
import { LABEL_TYPES, UNIT_MESURE } from '../models/label.schema';

// Mockeamos la instancia compartida de Axios
vi.mock('../../shared/adapter', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('LabelService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 🟢 HAPPY PATHS (FLUJOS EXITOSOS)
  // ==========================================
  describe('Happy Paths', () => {
    
    it('getAll: debería solicitar el listado con los filtros de tipo y añada mapeados correctamente', async () => {
      const mockResponse = { data: { results: [], count: 0 } };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const filters: LabelFilters = { 
        search: 'Ontalba reference', 
        label_type: LABEL_TYPES.FRONTAL, 
        vintage: '2026',
        page: '1' 
      };
      
      await LabelService.getAll(filters);

      // Verificamos el prefijo correcto de inventario y los params inyectados
      expect(apiClient.get).toHaveBeenCalledWith('inventory/labels/', { params: filters });
    });

    it('create: debería enviar un POST al endpoint de inventario con el payload de la etiqueta', async () => {
      const mockFormValue: LabelFormValues = {
        name: 'Etiqueta Ontalba Crianza',
        supplier: 4,
        label_type: LABEL_TYPES.FRONTAL,
        brand_reference: 'Ontalba Crianza Tempranillo',
        vintage: 2026,
        unit_mesure: UNIT_MESURE.UNIDAD,
        min_stock_level: '1500.00',
        is_active: true,
        description: 'Frontal papel rústico'
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 10, ...mockFormValue, internal_code: 'LBL-001' } });

      await LabelService.create(mockFormValue);

      expect(apiClient.post).toHaveBeenCalledWith('inventory/labels/', mockFormValue);
    });

    it('clone: debería llamar al método POST del endpoint de clonación para duplicar la añada', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 11, name: 'COPIA - Etiqueta', is_active: false } });

      // Ejecutamos la clonación sobre la etiqueta con ID 42
      await LabelService.clone(42);

      // Django CloneMixin espera un POST a la ruta de la instancia /id/clone/
      expect(apiClient.get).toHaveBeenCalledWith('inventory/labels/42/clone-prefill/');
    });
  });

  // ==========================================
  // 🛑 EDGE CASES & ERRORES (ROBUSTEZ DE RED)
  // ==========================================
  describe('Edge Cases & Errors', () => {

    it('getAll: debería procesar la llamada con éxito aunque no se le pasen parámetros', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { results: [], count: 0 } });
      
      await LabelService.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('inventory/labels/', { params: undefined });
    });

    it('partialUpdate: debería enviar una petición PATCH conteniendo únicamente los campos modificados', async () => {
      const partialData = { min_stock_level: '3000.00', is_active: false };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 1, name: 'Base Label', ...partialData } });

      await LabelService.partialUpdate(1, partialData);

      expect(apiClient.patch).toHaveBeenCalledWith('inventory/labels/1/', partialData);
    });

    it('delete: debería propagar y capturar los errores de servidor (Ej: Código 404 Not Found)', async () => {
      const mockError404 = {
        response: {
          status: 404,
          data: { detail: 'El material de etiquetado seleccionado no existe.' }
        }
      };
      
      vi.mocked(apiClient.delete).mockRejectedValue(mockError404);

      try {
        await LabelService.delete(999);
      } catch (error: any) {
        // Validamos que el catch intercepta la estructura estándar del interceptor de Axios
        expect(error.response.status).toBe(404);
        expect(error.response.data.detail).toBe('El material de etiquetado seleccionado no existe.');
      }
      
      expect(apiClient.delete).toHaveBeenCalledWith('inventory/labels/999/');
    });
  });
});