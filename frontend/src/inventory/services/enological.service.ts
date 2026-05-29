import { apiClient } from '../../shared/adapter'; // Ajusta la ruta relativa según corresponda en tu árbol de directorios
import type { 
  EnologicalPaginationResponse, 
  EnologicalFormValues, 
  EnologicalMaterial,
  EnologicalFilters 
} from '../models/enological.schema';

export const EnologicalService = {
  /**
   * Obtener lista paginada y filtrada de productos enológicos (GET /inventory/enological/)
   * Conectado con useDataTable para la barra de búsqueda y el selector por tipología (enological_type)
   */
  getAll: async (params?: EnologicalFilters) => {
    const { data } = await apiClient.get<EnologicalPaginationResponse>('inventory/enological/', { params });
    return data;
  },

  /**
   * Ver la ficha técnica de un compuesto enológico en detalle mediante su ID interno (GET /inventory/enological/{id}/)
   */
  getById: async (id: number) => {
    const { data } = await apiClient.get<EnologicalMaterial>(`inventory/enological/${id}/`);
    return data;
  },

  /**
   * Registrar un nuevo aditivo o corrector enológico en el sistema de la bodega (POST /inventory/enological/)
   */
  create: async (enologicalItem: EnologicalFormValues) => {
    const { data } = await apiClient.post<EnologicalMaterial>('inventory/enological/', enologicalItem);
    return data;
  },

  /**
   * Modificación total de las propiedades y formato del producto químico (PUT /inventory/enological/{id}/)
   */
  update: async (id: number, enologicalItem: EnologicalFormValues) => {
    const { data } = await apiClient.put<EnologicalMaterial>(`inventory/enological/${id}/`, enologicalItem);
    return data;
  },

  /**
   * Modificación parcial de parámetros de stock, descripción o alertas (PATCH /inventory/enological/{id}/)
   */
  partialUpdate: async (id: number, enologicalItem: Partial<EnologicalFormValues>) => {
    const { data } = await apiClient.patch<EnologicalMaterial>(`inventory/enological/${id}/`, enologicalItem);
    return data;    
  },

  /**
   * Dar de baja o eliminar el producto enológico de la base de datos (DELETE /inventory/enological/{id}/)
   * Retorna un HTTP 204 No Content desde Django Rest Framework
   */
  delete: async (id: number) => {
    await apiClient.delete(`inventory/enological/${id}/`);
  },
};