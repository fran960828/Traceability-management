// src/modules/suppliers/services/supplier.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupplierService } from './supplier.service';
import { apiClient } from '../../shared/adapter';
import type { SupplierFilters } from '../models';

// Mockeamos la instancia de axios
vi.mock('../../shared/adapter', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('SupplierService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- HAPPY PATHS ---
  describe('Happy Path', () => {
    it('getAll: debería obtener proveedores con filtros correctamente', async () => {
      const mockResponse = { data: { results: [], count: 0 } };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const filters:SupplierFilters = { name: 'Ontalba', page: 1 };
      await SupplierService.getAll(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/suppliers/', { params: filters });
    });

    it('create: debería enviar un POST con los datos del nuevo proveedor', async () => {
      const newSupplier = { name: 'Proveedor Test', tax_id: '12345J', category: 1 };
      (apiClient.post as any).mockResolvedValue({ data: { id: 1, ...newSupplier } });

      await SupplierService.create(newSupplier as any);

      expect(apiClient.post).toHaveBeenCalledWith('/suppliers/', newSupplier);
    });
  });

  // --- EDGE CASES / ROBUSTEZ ---
  describe('Edge Cases & Errors', () => {
    it('getAll: debería funcionar sin parámetros (filtros opcionales)', async () => {
      (apiClient.get as any).mockResolvedValue({ data: { results: [] } });
      
      await SupplierService.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/suppliers/', { params: undefined });
    });

    it('delete: debería gestionar correctamente la eliminación de un ID inexistente (Error de API)', async () => {
      // Simulamos que el backend responde con un 404
      const error404 = { response: { status: 404, data: { detail: 'Not found' } } };
      (apiClient.delete as any).mockRejectedValue(error404);

      try {
        await SupplierService.delete(999);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.detail).toBe('Not found');
      }
      
      expect(apiClient.delete).toHaveBeenCalledWith('/suppliers/999/');
    });

    it('partialUpdate: debería enviar solo los campos modificados con PATCH', async () => {
      const partialData = { lead_time: 15 };
      (apiClient.patch as any).mockResolvedValue({ data: { id: 1, name: 'Old Name', ...partialData } });

      await SupplierService.partialUpdate(1, partialData);

      expect(apiClient.patch).toHaveBeenCalledWith('/suppliers/1/', partialData);
    });
  });
});