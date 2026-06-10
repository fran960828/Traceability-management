// src/modules/inventory/services/__tests__/location.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocationService } from './location.service';
import { apiClient } from '../../shared/adapter';
import type { LocationFilters, LocationFormValues } from '../models/location.schema';

// Mockeamos la instancia central de Axios
vi.mock('../../shared/adapter', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('LocationService - Unit & Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 🟢 SECCIÓN 1: HAPPY PATHS (CASOS DE ÉXITO)
  // ==========================================
  describe('Happy Path', () => {
    it('1. getAll - Debería despachar filtros hacia stock/locations/ y limpiar strings vacíos', async () => {
      const mockResponse = { data: { results: [], count: 0 } };
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      // Enviamos un parámetro relleno y otro vacío del input de búsqueda HTML
      const filters: LocationFilters = { search: 'ALMACEN', page: '' };
      await LocationService.getAll(filters);

      // Verificamos que 'page' se ha eliminado preventivamente para no saturar la URL
      expect(apiClient.get).toHaveBeenCalledWith('stock/locations/', {
        params: { search: 'ALMACEN' }
      });
    });

    it('2. getById - Debería recuperar la ficha descriptiva de una ubicación por ID', async () => {
      const mockLocation = { id: 2, name: 'BODEGA_FINAL', description: 'Vino terminado', is_active: true };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockLocation });

      const result = await LocationService.getById(2);

      expect(apiClient.get).toHaveBeenCalledWith('stock/locations/2/');
      expect(result.name).toBe('BODEGA_FINAL');
    });

    it('3. create - Debería lanzar una petición POST con la configuración espacial de la zona', async () => {
      const newLocation: LocationFormValues = {
        name: 'NAVE_C',
        description: 'Almacenamiento de packaging secundario',
        is_active: true
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 12, ...newLocation, created_at: '2026-06-09T12:00:00Z' } });

      const result = await LocationService.create(newLocation);

      expect(apiClient.post).toHaveBeenCalledWith('stock/locations/', newLocation);
      expect(result.id).toBe(12);
    });
  });

  // ==========================================
  // 🔴 SECCIÓN 2: EDGE CASES & ROBUSTEZ ERRÓNEA
  // ==========================================
  describe('Edge Cases & Errors', () => {
    it('4. getAll - Debería responder de manera estable si se invoca sin pasar filtros', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { results: [], count: 0 } });

      await LocationService.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('stock/locations/', { params: undefined });
    });

    it('5. update - Debería ejecutar un PUT íntegro con el ID correspondiente en la ruta', async () => {
      const updateData: LocationFormValues = { name: 'ALMACEN_PRINCIPAL', description: 'Nave optimizada', is_active: true };
      vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: 1, ...updateData } });

      await LocationService.update(1, updateData);

      expect(apiClient.put).toHaveBeenCalledWith('stock/locations/1/', updateData);
    });

    it('6. partialUpdate - Debería despachar un PATCH para conmutar el estado is_active de forma aislada', async () => {
      const partialData = { is_active: false };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { id: 5, name: 'SILO_A', is_active: false } });

      await LocationService.partialUpdate(5, partialData);

      expect(apiClient.patch).toHaveBeenCalledWith('stock/locations/5/', partialData);
    });

    it('7. delete - Debería propagar limpiamente un error 400 si Django deniega el borrado por stock vinculado', async () => {
      // Si la ubicación tiene mercancía residual, tu backend lanzará un ValidationError protegido
      const djangoErrorResponse = {
        response: {
          status: 400,
          data: { protected_error: ['No se puede eliminar la localización porque contiene lotes físicos activos.'] }
        }
      };
      vi.mocked(apiClient.delete).mockRejectedValueOnce(djangoErrorResponse);

      await expect(LocationService.delete(1)).rejects.toThrow();
      expect(apiClient.delete).toHaveBeenCalledWith('stock/locations/1/');
    });
  });
});