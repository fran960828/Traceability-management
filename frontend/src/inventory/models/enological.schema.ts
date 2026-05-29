import { z } from 'zod';
import { UNIT_MESURE } from './label.schema';
// ==========================================
// 1. ENUMS Y ESQUEMAS DE VALIDACIÓN (ZOD) - POST/PUT
// ==========================================

export enum ENOLOGICAL_TYPES {
  ESTABILIZANTE = "ESTABILIZANTE",
  CONSERVANTE = "CONSERVANTE",
  ACIDIFICANTE = "ACIDIFICANTE",
}


export const EnologicalFormSchema = z.object({
  name: z.string().min(1, 'El nombre del producto enológico es obligatorio'),
  supplier: z.number().int().positive('Selecciona un proveedor válido'),
  enological_type: z.enum(Object.values(ENOLOGICAL_TYPES) as [string, ...string[]]),
  commercial_format: z.string().min(1, 'El formato de envase comercial es obligatorio'),
  unit_mesure: z.enum(Object.values(UNIT_MESURE) as [string, ...string[]]),
  
  // Nivel de alerta para el InventoryAlertMixin (Tratado como string numérico positivo para evitar fallos de coma flotante)
  min_stock_level: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    { message: 'El stock mínimo debe ser un número igual o superior a 0' }
  ),
  is_active: z.boolean(),
  description: z.string().optional(),
});

export type EnologicalFormValues = z.infer<typeof EnologicalFormSchema>;

// ==========================================
// 2. MODELOS DE DOMINIO / RESPUESTAS API (GET)
// ==========================================

// Interfaz para un Producto Enológico individual devuelto por el ViewSet de Django
export interface EnologicalMaterial extends EnologicalFormValues {
  id: number;
  internal_code: string;           // Código único autogenerado por el backend (ENO-YYYY-XXX)
  enological_type_display: string; // Texto legible por humanos (Ej: "Acidificantes y Correctores")
  unit_mesure_display: string;     // Texto legible por humanos (Ej: "Kilos")
  current_stock: string;           // Cantidad total en almacén (Decimal de Django en string)
  is_low_stock: boolean | string;  // Indicador de rotura de stock inyectado por el Mixin
  created_at: string;
  updated_at: string;
}

// Estructura exacta que escupe drf-spectacular para el listado paginado
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type EnologicalPaginationResponse = PaginatedResponse<EnologicalMaterial>;

// ==========================================
// 3. FILTROS DE NAVEGACIÓN (Query Parameters)
// ==========================================

export interface EnologicalFilters {
  page?: string;          // Control coordinado por el hook useDataTable
  search?: string;        // Mapea con search_fields = ["name", "internal_code"]
  enological_type?: string; // Mapea con el query param filtrado de Django
}