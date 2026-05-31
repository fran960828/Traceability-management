import { apiClient } from '../../shared/adapter'; // Ajusta la ruta relativa según corresponda en tu árbol
import type { 
  WinePaginationResponse, 
  WineFormValues, 
  WineMaterial,
  WineFilters 
} from '../models/wines.schema';

export const WineService = {
  /**
   * Obtener lista paginada y filtrada del catálogo maestro de vinos (GET /wines/wines/)
   * Conectado con useDataTable para la barra de búsqueda global y selectores de query_params (vintage, wine_type)
   */
  getAll: async (params?: WineFilters) => {
    const { data } = await apiClient.get<WinePaginationResponse>('wines/wines/', { params });
    return data;
  },

  /**
   * Consultar la ficha técnica completa de un vino en detalle mediante su ID interno (GET /wines/wines/{id}/)
   */
  getById: async (id: number) => {
    const { data } = await apiClient.get<WineMaterial>(`wines/wines/${id}/`);
    return data;
  },

  /**
   * Registrar una nueva ficha técnica de vino y su escandallo en el sistema (POST /wines/wines/)
   * Valida la integridad de materiales en el backend y genera el código WN- automático
   */
  create: async (wineData: WineFormValues) => {
    const { data } = await apiClient.post<WineMaterial>('wines/wines/', wineData);
    return data;
  },

  /**
   * Modificación total del registro de la ficha técnica del vino (PUT /wines/wines/{id}/)
   */
  update: async (id: number, wineData: WineFormValues) => {
    const { data } = await apiClient.put<WineMaterial>(`wines/wines/${id}/`, wineData);
    return data;
  },

  /**
   * Modificación parcial de parámetros sueltos o alternancia de estado activo (PATCH /wines/wines/{id}/)
   */
  partialUpdate: async (id: number, wineData: Partial<WineFormValues>) => {
    const { data } = await apiClient.patch<WineMaterial>(`wines/wines/${id}/`, wineData);
    return data;    
  },

  /**
   * Eliminar físicamente o dar de baja el registro de la ficha técnica del vino (DELETE /wines/wines/{id}/)
   * Acción crítica restringida por RolePermission en el backend (Retorna un HTTP 204)
   */
  delete: async (id: number) => {
    await apiClient.delete(`wines/wines/${id}/`);
  },

  /**
   * 🌟 ACCIÓN ESPECIAL: Preparar datos para clonar añada mediante CloneMixin (GET /wines/wines/{id}/clone-prefill/)
   * Recupera las propiedades base del vino limpiando IDs, códigos únicos y relaciones que caducan
   * con el cambio de añada (como etiquetas e internal_code), ideal para pre-rellenar el formulario.
   */
  clone: async (id: number) => {
    const { data } = await apiClient.get<WineMaterial>(`wines/wines/${id}/clone-prefill/`);
    return data;
  }
};