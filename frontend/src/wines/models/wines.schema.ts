import { z } from 'zod';

// ==========================================
// 1. ENUMS DEL MODELO DE NEGOCIO
// ==========================================

export enum APPELLATION_TYPES {
  DOP = "DOP",
  DOCa = "DOCa",
  VP = "VP",
  VC = "VC",
  IGP = "IGP",
  MESA = "MESA",
}

export enum WINE_TYPES {
  BLANCO = "BLANCO",
  TINTO = "TINTO",
  ROSADO = "ROSADO",
  ESPUMOSO = "ESPUMOSO",
  GENEROSO = "GENEROSO",
}

export enum AGING_CATEGORIES {
  JOVEN = "JOVEN",
  ROBLE = "ROBLE",
  CRIANZA = "CRIANZA",
  RESERVA = "RESERVA",
  GRAN_RESERVA = "GRAN_RESERVA",
}

// ==========================================
// 2. ESQUEMA DE VALIDACIÓN (ZOD) - POST/PUT
// ==========================================

export const WineFormSchema = z.object({
  name: z.string().min(1, 'El nombre del vino es obligatorio'),
  
  // Validamos que el año sea realista e igual al rango de validadores de Django [1900-2100]
  vintage: z.number().int()
    .min(1900, 'El año debe ser superior a 1900')
    .max(2100, 'El año no puede exceder el 2100'),
    
  appellation_type: z.enum(Object.values(APPELLATION_TYPES) as [string, ...string[]]),
  appellation_name: z.string().min(1, 'El nombre de la denominación es obligatorio'),
  wine_type: z.enum(Object.values(WINE_TYPES) as [string, ...string[]]),
  aging_category: z.enum(Object.values(AGING_CATEGORIES) as [string, ...string[]]),
  
  varietals: z.string().min(1, 'Debes indicar las variedades de uva utilizadas'),
  
  // Convertido en string numérico en el formulario por tratarse de un DecimalField
  alcohol_percentage: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100,
    { message: 'El grado alcohólico debe ser un porcentaje válido entre 0 y 100' }
  ),
  is_active: z.boolean(),

  // --- RELACIONES ESTRUCTURALES DEL ESCANDALLO (IDs numéricos de FKs) ---
  default_container: z.string().min(1, 'El envase principal es obligatorio'),
  default_cork: z.string().nullable().optional(),
  default_front_label: z.string().nullable().optional(),
  default_back_label: z.string().nullable().optional(),
  default_dop_seal: z.string().nullable().optional(),
  default_capsule: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  // 🔥 REFINAMIENTO EN CASCADA AVANZADO - ESPEJO EXACTO DEL CLEAN() DE DJANGO

  // 1. Validación de Tirilla obligatoria para DOP/DOCa
  const requiresSeal = ['DOP', 'DOCa'].includes(data.appellation_type);
  if (requiresSeal && !data.default_dop_seal) {
    ctx.addIssue({
      code: "custom",
      message: `Un vino con mención de calidad regulada requiere un Precinto/Tirilla DOP de garantía`,
      path: ["default_dop_seal"],
    });
  }

  // Nota: Los mismatches de añada de las etiquetas frontal/contra contra el campo vintage del vino
  // se delegan a la selección en caliente en el formulario de UI filtrando por añada, 
  // o mediante validación cruzada extendida si se inyectan los objetos completos.
});

export type WineFormValues = z.infer<typeof WineFormSchema>;

// ==========================================
// 3. MODELOS DE DOMINIO / RESPUESTAS API (GET)
// ==========================================

// Estructura anidada para las lecturas e hidratación de Fichas Técnicas completas
export interface WineMaterial extends Omit<WineFormValues, 'alcohol_percentage'> {
  id: number;
  internal_code: string;           // Código único autogenerado (WN-YYYY-XXX)
  alcohol_percentage: string;      // Viene como string decimal desde Django (Ej: "14.50")
  
  // Mapeos de displays e inyecciones de Django serializadas para lectura en tablas/detalles
  appellation_type_display: string;
  wine_type_display: string;
  aging_category_display: string;
  created_at: string;
  updated_at: string;

  // Detalles extendidos opcionales del escandallo (inyectados si se hace un select_related en el API)
  container_name?: string;
  cork_name?: string;
  front_label_name?: string;
  dop_seal_name?: string;
}

// Estructura de paginación drf-spectacular común de Ontalba
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type WinePaginationResponse = PaginatedResponse<WineMaterial>;

// ==========================================
// 4. FILTROS DE NAVEGACIÓN (Sincronizados con WineViewSet)
// ==========================================

export interface WineFilters {
  page?: string;          // Control de paginado en useDataTable
  search?: string;        // Mapea con search_fields = ["name", "appellation_name", "internal_code"]
  vintage?: string;       // Filtrado por año de cosecha en query_params
  wine_type?: string;     // Filtrado por tipo (TINTO, BLANCO, etc.)
}