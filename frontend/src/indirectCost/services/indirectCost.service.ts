// src/modules/pricing/services/indirectCost.service.ts
import { apiClient } from '../../shared/adapter';
import type {
  IndirectCostConfig,
  IndirectCostConfigFormValues,
  IndirectCostConfigPaginationResponse,
  IndirectCostFilters,
} from '../models/indirectCost.schema';

export const IndirectCostService = {
  /**
   * 📋 LISTAR TASAS DE COSTES INDIRECTOS
   * GET /api/pricing/indirect-costs/
   */
  getAll: async (filters?: IndirectCostFilters): Promise<IndirectCostConfigPaginationResponse> => {
    const cleanParams = filters
      ? Object.keys(filters).reduce((acc, key) => {
          const val = (filters as any)[key];
          if (val !== undefined && val !== null && val !== '') {
            acc[key] = val;
          }
          return acc;
        }, {} as Record<string, any>)
      : undefined;

    const { data } = await apiClient.get<IndirectCostConfigPaginationResponse>('pricing/indirect-costs/', {
      params: cleanParams,
    });
    return data;
  },

  /**
   * 🔍 OBTENER CONFIGURACIÓN POR ID
   * GET /api/pricing/indirect-costs/{id}/
   */
  getById: async (id: number): Promise<IndirectCostConfig> => {
    const { data } = await apiClient.get<IndirectCostConfig>(`pricing/indirect-costs/${id}/`);
    return data;
  },

  /**
   * 📝 REGISTRAR NUEVA CONFIGURACIÓN DE TASAS
   * POST /api/pricing/indirect-costs/
   */
  create: async (payload: IndirectCostConfigFormValues): Promise<IndirectCostConfig> => {
    const { data } = await apiClient.post<IndirectCostConfig>('pricing/indirect-costs/', payload);
    return data;
  },

  /**
   * 🔄 ACTUALIZAR CONFIGURACIÓN EXISTENTE
   * PUT /api/pricing/indirect-costs/{id}/
   */
  update: async (id: number, payload: IndirectCostConfigFormValues): Promise<IndirectCostConfig> => {
    const { data } = await apiClient.put<IndirectCostConfig>(`pricing/indirect-costs/${id}/`, payload);
    return data;
  },

  /**
   * ❌ ELIMINAR CONFIGURACIÓN DE TASAS
   * DELETE /api/pricing/indirect-costs/{id}/
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`pricing/indirect-costs/${id}/`);
  },
};