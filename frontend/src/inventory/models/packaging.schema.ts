import { z } from 'zod';
import { UNIT_MESURE } from './label.schema';
// ==========================================
// 1. ENUMS Y ESQUEMAS DE VALIDACIÓN (ZOD) - POST/PUT
// ==========================================

export enum PACKAGING_TYPES {
  VIDRIO = "VIDRIO",
  BIB = "BIB",
  PLASTICO = "PLASTICO",
  CIERRE = "CIERRE",
  CAPSULA = "CAPSULA",
  ETIQUETA = "ETIQUETA",
  EMBALAJE = "EMBALAJE",
}

export const PackagingFormSchema = z.object({
  name: z.string().min(1, 'El nombre del material es obligatorio'),
  supplier: z.number().int().positive('Selecciona un proveedor válido'),
  packaging_type: z.enum(Object.values(PACKAGING_TYPES) as [string, ...string[]]),
  specification: z.string().min(1, 'La especificación técnica es obligatoria'),
  // Opcional en el esquema general, pero sanitizado condicionalmente en la UI según el tipo
  color: z.string().nullable().optional(),
  
  // El backend lo procesa como DecimalField (ej: "0.750"). Lo validamos como string numérico positivo.
  capacity: z.string()
    .nullable()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
      { message: 'La capacidad debe ser un volumen numérico superior a 0' }
    ),
    
  unit_mesure: z.enum(Object.values(UNIT_MESURE) as [string, ...string[]]),
  
  // Nivel mínimo para el InventoryAlertMixin (Decimal de Django mapeado en string)
  min_stock_level: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) >= 0,
    { message: 'El stock mínimo debe ser un número igual o superior a 0' }
  ),
  is_active: z.boolean(),
  description: z.string().optional(),
}).superRefine((data, ctx) => {
  // 🔥 Refinamiento avanzado en cascada (Espejo de las reglas de limpieza .clean() de Django)
  
  // Regala 1: Si NO es un contenedor físico, la capacidad debe quedar vacía
  const isContainer = ['VIDRIO', 'BIB', 'PLASTICO'].includes(data.packaging_type);
  if (!isContainer && data.capacity && Number(data.capacity) > 0) {
    ctx.addIssue({
      code: "custom",  
      message: "La capacidad de volumen solo se asigna a botellas, garras o BIBs",
      path: ["capacity"],
    });
  }

  // Regla 2: El color es crítico exclusivamente para el vidrio y las cápsulas
  const hasColor = ['VIDRIO', 'CAPSULA'].includes(data.packaging_type);
  if (!hasColor && data.color && data.color.trim() !== '') {
    ctx.addIssue({
      code: "custom",
      message: "El atributo color solo aplica a Vidrio o Cápsulas",
      path: ["color"],
    });
  }
});

export type PackagingFormValues = z.infer<typeof PackagingFormSchema>;

// ==========================================
// 2. MODELOS DE DOMINIO / RESPUESTAS API (GET)
// ==========================================

// Interfaz para un Material de Packaging que viene del servidor Django
export interface PackagingMaterial extends Omit<PackagingFormValues, 'capacity'> {
  id: number;
  internal_code: string;           // Código único autogenerado por Django (PAC-YYYY-XXX)
  packaging_type_display: string;  // Texto legible de Django (Ej: "Vidrio (Botellas)")
  unit_mesure_display: string;     // Texto legible de Django (Ej: "Unidades")
  current_stock: string;           // Cantidad en almacén en formato string decimal
  is_low_stock: boolean;           // Inyectado por el InventoryAlertMixin
  capacity: string | null;         // Volvemos a tipar la capacidad limpia para lectura del API
  created_at: string;
  updated_at: string;
}

// Estructura de paginación drf-spectacular común de Ontalba
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type PackagingPaginationResponse = PaginatedResponse<PackagingMaterial>;

// ==========================================
// 3. FILTROS DE NAVEGACIÓN (Query Parameters)
// ==========================================

export interface PackagingFilters {
  page?: string;          // Control de paginado en el hook useDataTable
  search?: string;        // Mapea con search_fields = ["name", "internal_code"]
  packaging_type?: string;// Mapea con el query param del ViewSet
}