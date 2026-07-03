import { apiClient } from '../../shared/adapter';
import type { 
  ProductionOrder, 
  ProductionOrderPaginationResponse, 
  ProductionOrderFilters, 
  ProductionOrderOutput 
} from '../models/productionRecord.schema';

export const ProductionService = {
  /**
   * 📋 LISTAR PARTES DE PRODUCCIÓN PAGINADOS
   * GET /api/production/orders/
   */
  getAll: async (filters?: ProductionOrderFilters): Promise<ProductionOrderPaginationResponse> => {
    const cleanParams = filters
      ? Object.keys(filters).reduce((acc, key) => {
          const val = (filters as any)[key];
          if (val !== undefined && val !== null && val !== '') {
            acc[key] = val;
          }
          return acc;
        }, {} as Record<string, any>)
      : undefined;

    const { data } = await apiClient.get<ProductionOrderPaginationResponse>('production/orders/', {
      params: cleanParams,
    });
    return data;
  },

  /**
   * 🔍 OBTENER EL DETALLE TÉCNICO DE UN PARTE DE EMBOTELLADO
   * GET /api/production/orders/{id}/
   */
  getById: async (id: number): Promise<ProductionOrder> => {
    const { data } = await apiClient.get<ProductionOrder>(`production/orders/${id}/`);
    return data;
  },

  /**
   * 📝 CREAR PARTE EN BORRADOR (DRAFT)
   * POST /api/production/orders/
   */
  create: async (payload: ProductionOrderOutput): Promise<ProductionOrder> => {
    const { data } = await apiClient.post<ProductionOrder>('production/orders/', payload);
    return data;
  },

  /**
   * 🔄 ACTUALIZAR PARTE DE PRODUCCIÓN (SOLO SI ES BORRADOR)
   * PUT /api/production/orders/{id}/
   */
  update: async (id: number, payload: ProductionOrderOutput): Promise<ProductionOrder> => {
    const { data } = await apiClient.put<ProductionOrder>(`production/orders/${id}/`, payload);
    return data;
  },

  /**
   * ❌ ELIMINAR BORRADOR TOTALMENTE
   * DELETE /api/production/orders/{id}/
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`production/orders/${id}/`);
  },

  /**
   * 🚀 CONFIRMAR PARTE DE EMBOTELLADO (DISPARA FIFO Y CIERRA STOCK)
   * Ejecuta la lógica pesada transaccional en el servidor.
   * POST /api/production/orders/{id}/confirm/
   */
  confirm: async (id: number): Promise<ProductionOrder> => {
    const { data } = await apiClient.post<ProductionOrder>(`production/orders/${id}/confirm/`);
    return data;
  },

  /**
   * 🛑 CANCELAR PARTE DE EMBOTELLADO (SIN TOCAR STOCK)
   * POST /api/production/orders/{id}/cancel/
   */
  cancel: async (id: number): Promise<{ detail: string }> => {
    const { data } = await apiClient.post<{ detail: string }>(`production/orders/${id}/cancel/`);
    return data;
  },

  /**
   * 👥 PREPARAR DATOS DE CLONACIÓN PROPORCIONAL
   * GET /api/production/orders/{id}/clone_prefill/
   */
  getClonePrefill: async (id: number): Promise<ProductionOrder> => {
    const { data } = await apiClient.get<ProductionOrder>(`production/orders/${id}/clone-prefill/`);
    return data;
  },
};