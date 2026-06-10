// src/modules/inventory/models/location.schema.ts
import { z } from 'zod';

// ==========================================
// 1. ESQUEMAS DE VALIDACIÓN (ZOD) - POST/PUT
// ==========================================
export const LocationFormSchema = z.object({
  name: z.string()
    .min(1, 'El nombre de la ubicación es obligatorio')
    .max(50, 'El nombre no puede exceder los 50 caracteres')
    .refine(
      (val) => /^[a-zA-Z0-9_ÁÉÍÓÚÜÑáéíóúüñ\s]+$/.test(val),
      { message: 'Solo se permiten letras, números, espacios y guiones bajos (_)' }
    ),
  description: z.string()
    .max(250, 'La descripción no puede exceder los 250 caracteres')
    .optional()
    .or(z.literal('')), // Permite strings vacíos sin fallar
  is_active: z.boolean(),
});

export type LocationFormValues = z.infer<typeof LocationFormSchema>;

// ==========================================
// 2. MODELOS DE DOMINIO / RESPUESTAS API (GET)
// ==========================================
export interface Location extends LocationFormValues {
  id: number;
  created_at: string; // Fecha ISO devuelta por Django
}

// Estructura de paginación de drf-spectacular para Localizaciones
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type LocationPaginationResponse = PaginatedResponse<Location>;

// ==========================================
// 3. FILTROS DE NAVEGACIÓN (Sincronizados con la ViewSet)
// ==========================================
export interface LocationFilters {
  page?: string;
  search?: string; // Django permite buscar de forma genérica
}