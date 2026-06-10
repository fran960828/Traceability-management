// src/modules/inventory/services/location.service.ts
import { apiClient } from '../../shared/adapter'; // Tu cliente Axios configurado
import type { 
  Location, 
  LocationPaginationResponse, 
  LocationFormValues, 
  LocationFilters 
} from '../models/location.schema';

export const LocationService = {
  /**
   * 🔍 Obtener lista paginada y filtrada de ubicaciones físicas
   * Mapea con GET stock/locations/
   */
  getAll: async (params?: LocationFilters): Promise<LocationPaginationResponse> => {
    // Eliminamos parámetros vacíos o undefined antes de enviar para no ensuciar la query string
    const cleanParams = params 
      ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== ''))
      : undefined;

    const { data } = await apiClient.get<LocationPaginationResponse>('stock/locations/', { params: cleanParams });
    return data;
  },

  /**
   * 📄 Ver una ubicación de stock en detalle
   * Mapea con GET stock/locations/{id}/
   */
  getById: async (id: number): Promise<Location> => {
    const { data } = await apiClient.get<Location>(`stock/locations/${id}/`);
    return data;
  },

  /**
   * ➕ Crear nueva zona de almacenamiento físico (Almacén, Silo, Depósito)
   * Mapea con POST stock/locations/
   */
  create: async (location: LocationFormValues): Promise<Location> => {
    const { data } = await apiClient.post<Location>('stock/locations/', location);
    return data;
  },

  /**
   * 📝 Modificación total de la localización
   * Mapea con PUT stock/locations/{id}/
   */
  update: async (id: number, location: LocationFormValues): Promise<Location> => {
    const { data } = await apiClient.put<Location>(`stock/locations/${id}/`, location);
    return data;
  },

  /**
   * 🩹 Modificación parcial - Solo campos enviados (Útil para conmutar is_active)
   * Mapea con PATCH stock/locations/{id}/
   */
  partialUpdate: async (id: number, location: Partial<LocationFormValues>): Promise<Location> => {
    const { data } = await apiClient.patch<Location>(`stock/locations/${id}/`, location);
    return data;    
  },

  /**
   * ❌ Eliminación del registro (Permitido por Django si no tiene stocks vinculados)
   * Mapea con DELETE stock/locations/{id}/
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`stock/locations/${id}/`);
  }
};