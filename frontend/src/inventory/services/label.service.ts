import { apiClient } from '../../shared/adapter'; // Ajusta la ruta relativa según corresponda
import type { 
  LabelPaginationResponse, 
  LabelFormValues, 
  LabelMaterial,
  LabelFilters 
} from '../models/label.schema';

export const LabelService = {
  /**
   * Obtener lista paginada y filtrada de etiquetas (GET /inventory/labels/)
   * Mapea con la barra de búsqueda global y selectores de query_params (label_type, vintage)
   */
  getAll: async (params?: LabelFilters) => {
    const { data } = await apiClient.get<LabelPaginationResponse>('inventory/labels/', { params });
    return data;
  },

  /**
   * Ver una etiqueta en detalle mediante su ID interno (GET /inventory/labels/{id}/)
   */
  getById: async (id: number) => {
    const { data } = await apiClient.get<LabelMaterial>(`inventory/labels/${id}/`);
    return data;
  },

  /**
   * Registrar una nueva etiqueta en el sistema de inventario (POST /inventory/labels/)
   */
  create: async (label: LabelFormValues) => {
    const { data } = await apiClient.post<LabelMaterial>('inventory/labels/', label);
    return data;
  },

  /**
   * Modificación total del registro de la etiqueta (PUT /inventory/labels/{id}/)
   */
  update: async (id: number, label: LabelFormValues) => {
    const { data } = await apiClient.put<LabelMaterial>(`inventory/labels/${id}/`, label);
    return data;
  },

  /**
   * Modificación parcial de parámetros sueltos de la etiqueta (PATCH /inventory/labels/{id}/)
   */
  partialUpdate: async (id: number, label: Partial<LabelFormValues>) => {
    const { data } = await apiClient.patch<LabelMaterial>(`inventory/labels/${id}/`, label);
    return data;    
  },

  /**
   * Dar de baja o eliminar el material de etiquetado (DELETE /inventory/labels/{id}/)
   */
  delete: async (id: number) => {
    await apiClient.delete(`inventory/labels/${id}/`);
    // Retorna un HTTP 204 No Content desde Django Rest Framework
  },

  /**
   * 🌟 ACCIÓN ESPECIAL: Disparar el flujo de clonación del CloneMixin del backend
   * Envía una petición POST al endpoint de la instancia para duplicar la ficha técnica 
   * omitiendo los campos configurados en clone_reset_fields (Ej: POST /inventory/labels/{id}/clone/)
   */
  clone: async (id: number) => {
    const { data } = await apiClient.get<LabelMaterial>(`inventory/labels/${id}/clone-prefill/`);
    return data;
  }
};