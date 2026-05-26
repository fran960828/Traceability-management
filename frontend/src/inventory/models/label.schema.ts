import { z } from 'zod';

// ==========================================
// 1. ESQUEMAS DE VALIDACIÓN (ZOD) - PARA EL FORMULARIO (POST/PUT)
// ==========================================
export enum LABEL_TYPES {
    FRONTAL = "FRONTAL",
    CONTRA = 'CONTRA',
    COLLARIN = 'COLLARIN',
    TIRILLA = 'TIRILLA',
    MEDALLA = 'MEDALLA'
  }

export enum UNIT_MESURE {
    UNIDAD='UNIDAD',
    MILLAR='MILLAR',
    KILOS='KILOS',
    LITROS='LITROS'
}

export const LabelFormSchema = z.object({
  name: z.string().min(1, 'El nombre de la etiqueta es obligatorio'),
  supplier: z.number().int().positive('Selecciona un proveedor válido'),
  label_type: z.enum(Object.values(LABEL_TYPES) as [string, ...string[]]),
  brand_reference: z.string().min(1, 'La referencia de marca (Vino) es obligatoria'),
  // Validamos que el año sea realista para una añada de bodega
  vintage: z.number().int().min(1900, 'Año no válido').max(2100, 'Año no válido'),
  unit_mesure: z.enum(Object.values(UNIT_MESURE) as [string, ...string[]]),
  // El backend espera un string que represente un decimal (ej: "1500.00")
  min_stock_level: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    { message: 'El stock mínimo debe ser un número positivo' }
  ),
  is_active: z.boolean(),
  description: z.string().optional(),
});

export type LabelFormValues = z.infer<typeof LabelFormSchema>;

// ==========================================
// 2. MODELOS DE DOMINIO / RESPUESTAS API (GET)
// ==========================================

// Interfaz para una Etiqueta individual que viene del servidor Django
export interface LabelMaterial extends LabelFormValues {
  id: number;
  internal_code: string;           // Código único autogenerado por Django
  label_type_display: string;      // Texto legible (Ej: "Frontal (Delantera)")
  unit_mesure_display: string;     // Texto legible (Ej: "Unidades")
  current_stock: string;           // Decimal de Django en formato string
  is_low_stock: boolean | string;  // Alerta del InventoryAlertMixin
  created_at: string;
  updated_at: string;
}

// Estructura exacta que devuelve drf-spectacular para el listado paginado de etiquetas
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Alias específico para el consumo del hook useDataTable
export type LabelPaginationResponse = PaginatedResponse<LabelMaterial>;

// ==========================================
// 3. FILTROS DE NAVEGACIÓN (Sincronizados con Django query_params)
// ==========================================

export interface LabelFilters {
  page?: string;        // Recordatorio: viaja como string en el useDataTable modificado
  search?: string;      // Mapea con filter_backends (name, internal_code, brand_reference)
  label_type?: string;  // Mapea con self.request.query_params.get("label_type")
  vintage?: string;     // Mapea con self.request.query_params.get("vintage")
}