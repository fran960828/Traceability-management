import { z } from 'zod';

// ==========================================
// 1. ESQUEMAS DE VALIDACIÓN (ZOD)
// ==========================================

export const SupplierFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  tax_id: z.string().min(9, 'CIF/NIF no válido'),
  category: z.number().int().positive('Selecciona una categoría'),
  email_pedidos: z.email('Email no válido'), // Nota: Corregido z.email a z.string().email
  phone: z.string().min(9, 'Teléfono demasiado corto'),
  address: z.string().min(5, 'La dirección es obligatoria'),
  lead_time: z.number().int().min(0, 'No puede ser negativo'),
  is_active: z.boolean(),
});

export type SupplierFormValues = z.infer<typeof SupplierFormSchema>;

// ==========================================
// 2. MODELOS DE DOMINIO / RESPUESTAS API
// ==========================================

// Interfaz para un Proveedor individual que viene del servidor
export interface Supplier extends SupplierFormValues {
  id: number;
  supplier_code: string;
  category_name: string;
  created_at: string;
}

// Estructura exacta que devuelve drf-spectacular para el endpoint maestro de categorías
export interface CategoryOption {
  id: number;
  name: string;
}

// Estructura genérica que sigue drf-spectacular para las paginaciones de Django
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Alias específico para la respuesta paginada de proveedores
export type SupplierPaginationResponse = PaginatedResponse<Supplier>;

// ==========================================
// 3. FILTROS DE NAVEGACIÓN
// ==========================================

export interface SupplierFilters {
  page?: number;
  name?: string;
  tax_id?: string;
  category?: number;
}