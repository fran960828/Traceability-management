import { apiClient } from '../../shared/adapter'; // Ajusta la ruta relativa según tu árbol de directorios
import type { 
  PackagingPaginationResponse, 
  PackagingFormValues, 
  PackagingMaterial,
  PackagingFilters 
} from '../models/packaging.schema';

export const PackagingService = {
  /**
   * Obtener lista paginada y filtrada de materiales de acondicionamiento (GET /inventory/packaging/)
   * Conectado con useDataTable para la barra de búsqueda y el selector por tipo (packaging_type)
   */
  getAll: async (params?: PackagingFilters) => {
    const { data } = await apiClient.get<PackagingPaginationResponse>('inventory/packaging/', { params });
    return data;
  },

  /**
   * Ver una ficha técnica de packaging en detalle mediante su ID interno (GET /inventory/packaging/{id}/)
   */
  getById: async (id: number) => {
    const { data } = await apiClient.get<PackagingMaterial>(`inventory/packaging/${id}/`);
    return data;
  },

  /**
   * Registrar un nuevo material de packaging en el sistema de la bodega (POST /inventory/packaging/)
   */
  create: async (packagingItem: PackagingFormValues) => {
    const { data } = await apiClient.post<PackagingMaterial>('inventory/packaging/', packagingItem);
    return data;
  },

  /**
   * Modificación total de las propiedades del material de packaging (PUT /inventory/packaging/{id}/)
   */
  update: async (id: number, packagingItem: PackagingFormValues) => {
    const { data } = await apiClient.put<PackagingMaterial>(`inventory/packaging/${id}/`, packagingItem);
    return data;
  },

  /**
   * Modificación parcial de parámetros de stock o alertas de packaging (PATCH /inventory/packaging/{id}/)
   */
  partialUpdate: async (id: number, packagingItem: Partial<PackagingFormValues>) => {
    const { data } = await apiClient.patch<PackagingMaterial>(`inventory/packaging/${id}/`, packagingItem);
    return data;    
  },

  /**
   * Eliminar o dar de baja el material de acondicionamiento de la base de datos (DELETE /inventory/packaging/{id}/)
   * Retorna un HTTP 204 No Content desde Django Rest Framework
   */
  delete: async (id: number) => {
    await apiClient.delete(`inventory/packaging/${id}/`);
  },
};