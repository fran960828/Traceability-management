// src/modules/inventory/models/reception.schema.ts
import { z } from 'zod';

// ========================================================
// 📦 1. ESQUEMAS DE VALIDACIÓN (ZOD) - ENTRADA AL ALMACÉN
// ========================================================

/**
 * Valida de forma individual cada palet/caja que baja del camión
 */
export const GoodsReceptionItemSchema = z.object({
  order_item: z.number().int().positive(),
  location: z.coerce.number().int().positive('Debes seleccionar una localización de destino'),
  batch_number: z.string().min(1, 'El número de lote es obligatorio').max(50),
  quantity: z.number().int().min(1, 'La cantidad mínima a recibir es 1 unidad'),
  expiry_date: z.string().optional().or(z.literal('')).nullable().transform((val) => (val === '' || val === undefined ? null : val)),
  notes: z.string().default(''),
  
  // 🟢 CAMPOS INFORMATIVOS DE LA UI: Los agregamos como opcionales para que el resolver de TS encaje perfecto
  material_name: z.string().optional(),
  pending_quantity: z.number()
}).refine((data) => data.quantity <= data.pending_quantity, {
  message: "La cantidad supera el saldo pendiente de la orden",
  path: ["quantity"], // 👈 CRUCIAL: Esto enlaza el error directamente con el input de cantidad
});

export const BulkReceptionSchema = z.object({
  items: z.array(GoodsReceptionItemSchema).min(1, 'Debes añadir al menos un artículo')
});

export type BulkReceptionInput = z.input<typeof BulkReceptionSchema>;
export type BulkReceptionOutput = z.output<typeof BulkReceptionSchema>;



// ========================================================
// 📊 2. MODELOS DE DOMINIO / LIBRO DE REGISTRO DE STOCK
// ========================================================

export enum MOVEMENT_TYPE {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJ',
  TRANS_OUT = 'TRANS_OUT',
  TRANS_IN = 'TRANS_IN'
}

// 🟢 2. Mapeamos las etiquetas amigables para el Libro Diario de la interfaz
export const MOVEMENT_TYPE_LABELS: Record<MOVEMENT_TYPE, string> = {
  [MOVEMENT_TYPE.IN]: 'Entrada (Compra/Recepciones)',
  [MOVEMENT_TYPE.OUT]: 'Salida (Consumo/Embotellado)',
  [MOVEMENT_TYPE.ADJUSTMENT]: 'Ajuste de Inventario (Mermas)',
  [MOVEMENT_TYPE.TRANS_OUT]: 'Traslado (Salida de Origen)',
  [MOVEMENT_TYPE.TRANS_IN]: 'Traslado (Entrada a Destino)'
};

// 🟢 3. Enumerado para el nuevo Flag físico e indexado de disponibilidad del lote
export enum BATCH_STOCK_STATUS {
  AVAILABLE = 'AVAILABLE',
  DEPLETED = 'DEPLETED'
}

export const BATCH_STATUS_LABELS: Record<BATCH_STOCK_STATUS, string> = {
  [BATCH_STOCK_STATUS.AVAILABLE]: 'En Existencias',
  [BATCH_STOCK_STATUS.DEPLETED]: 'Agotado'
};

export interface Batch {
  id: number;
  batch_number: string;
  material_name: string;
  arrival_date: string;
  expiry_date: string | null;
  current_stock_cache: string; // DRF DecimalField mapeado como string para seguridad matemática
  stock_status: BATCH_STOCK_STATUS;
}

export interface Location {
  id: number;
  name: string;
  description: string;
}

/**
 * Interfaz del histórico inmutable de movimientos devuelto por StockMovementViewSet
 */
export interface StockMovement {
  id: number;
  batch: Batch;
  location: Location;
  quantity: string; 
  movement_type: MOVEMENT_TYPE;
  movement_type_display?: string; 
  reference_po: number | null;
  reference_po_number?: string;
  user_name: string; 
  notes: string;
  created_at: string;
}

// Estructuras de paginación genérica de la bodega para drf-spectacular
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type StockMovementPaginationResponse = PaginatedResponse<StockMovement>;

// ========================================================
// 🔍 3. FILTROS DE NAVEGACIÓN ANALÍTICOS (OpenApiParameters)
// ========================================================

export interface StockMovementFilters {
  page?: string;
  search?: string; // Mapea con search_fields (Lote o nombre material)
  movement_type?: string;
  supplier?: string;
  product_name?: string;
  location?: string;
  date_from?: string;
  date_to?: string;
}