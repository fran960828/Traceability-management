import { z } from 'zod';
// 🟢 Reutilización de la infraestructura existente para evitar rupturas y duplicación de enums
import { 
  MOVEMENT_TYPE,  
  type Batch as BaseBatch,
  type PaginatedResponse 
} from '../../reception/models';

// ========================================================
// 🏷️ 1. ESQUEMAS DE VALIDACIÓN (ZOD) PARA OPERACIONES POST
// ========================================================

/**
 * Esquema de Validación para Transferencias entre Ubicaciones.
 * Corresponde al `StockTransferSerializer` de Django.
 */
export const StockTransferSchema = z.object({
  batch: z.coerce.number().int().positive('Debes seleccionar un lote válido'),
  origin_location: z.coerce.number().int().positive('La ubicación de origen es obligatoria'),
  destination_location: z.coerce.number().int().positive('La ubicación de destino es obligatoria'),
  quantity: z.number().int().min(1, 'La cantidad mínima a transferir es 1 unidad'),
  notes: z.string().default(''),
}).refine((data) => data.origin_location !== data.destination_location, {
  message: 'La ubicación de destino no puede ser igual a la de origen.',
  path: ['destination_location'], // Enlaza el error directamente al input de destino en la UI
});

/**
 * Esquema de Validación para Retiradas, Mermas o Ajustes Manuales.
 * Corresponde al `StockMovementSerializer` usado en /adjustment y /dispose.
 */
export const StockAdjustmentSchema = z.object({
  batch: z.coerce.number().int().positive('Debes seleccionar un lote válido'),
  location: z.coerce.number().int().positive('La ubicación es obligatoria'),
  quantity: z.number().refine((val) => val !== 0, {
    message: 'La cantidad del movimiento no puede ser cero.',
  }),
  notes: z.string().min(5, 'Es obligatorio aportar una razón detallada del ajuste/merma (mín. 5 caracteres)'),
});

// Tipos de entrada y salida derivados de Zod para los formularios del muelle/bodega
export type StockTransferInput = z.input<typeof StockTransferSchema>;
export type StockTransferOutput = z.output<typeof StockTransferSchema>;

export type StockAdjustmentInput = z.input<typeof StockAdjustmentSchema>;
export type StockAdjustmentOutput = z.output<typeof StockAdjustmentSchema>;

// ========================================================
// 📑 2. INTERFACES DE DOMINIO EXTENDIDAS (RESPUESTAS GET)
// ========================================================

/**
 * Extensión analítica del Batch (Lote) para incluir el stock calculado dinámicamente.
 * Hereda las propiedades base del lote de recepciones.
 */
export interface InventoryBatch extends BaseBatch {
  current_stock: number; // Calculado por el @property agregado en Django
}

/**
 * Espejo del StockMovementSerializer de Django REST Framework para el histórico.
 */
export interface StockMovement {
  id: number;
  batch: number;                  // ID de la relación enviado/devuelto
  batch_detail?: BaseBatch;       // Objeto Batch anidado (mapeado si se usa select_related profundo)
  batch_number: string;           // Inyectado por ReadOnlyField del serializer
  product_name: string;           // Inyectado por SerializerMethodField (cruzado entre enológicos, packaging o labels)
  location: number;               // ID de la localización enviado/devuelto
  location_name: string;          // Inyectado por ReadOnlyField
  quantity: string;               // El DecimalField viaja como string para preservar precisión milimétrica (gramos) en JS
  movement_type: MOVEMENT_TYPE;   // Consume el enum importado de reception.schema
  reference_po: number | null;
  user: number;
  user_full_name: string;         // Inyectado por el ReadOnlyField (get_full_name)
  created_at: string;
  notes: string;
}

// Reutilizamos el PaginatedResponse genérico pasándole el tipo StockMovement
export type StockMovementPaginationResponse = PaginatedResponse<StockMovement>;

// Parámetros de filtrado avanzados aceptados por el get_queryset() de Django
export interface StockMovementFilters {
  page?: string;
  search?: string; // Filtra por lote o nombres parciales de materiales
  movement_type?: string;
  supplier?: string;
  product_name?: string;
  location?: string;
  date_from?: string;
  date_to?: string;
}