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
  expiry_date: z.string().optional().or(z.literal('')).nullable(),
  notes: z.string().default(''),
  
  // 🟢 CAMPOS INFORMATIVOS DE LA UI: Los agregamos como opcionales para que el resolver de TS encaje perfecto
  material_name: z.string().optional(),
  pending_quantity: z.number().optional(),
});

export const BulkReceptionSchema = z.object({
  items: z.array(GoodsReceptionItemSchema).min(1, 'Debes añadir al menos un artículo')
}).refine((data) => {
  const batches = data.items.map(i => i.batch_number).filter(b => b !== '');
  return batches.length === new Set(batches).size;
}, {
  message: 'Hay números de lote duplicados en esta recepción.',
  path: ['items']
});

export type GoodsReceptionItemValues = z.infer<typeof GoodsReceptionItemSchema>;
export type BulkReceptionValues = z.infer<typeof BulkReceptionSchema>;

// ========================================================
// 📊 2. MODELOS DE DOMINIO / LIBRO DE REGISTRO DE STOCK
// ========================================================

export enum MOVEMENT_TYPE {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJ',
  TRANSFER = 'TRA'
}

export const MOVEMENT_TYPE_LABELS: Record<MOVEMENT_TYPE, string> = {
  [MOVEMENT_TYPE.IN]: 'Entrada (Compra/Recepciones)',
  [MOVEMENT_TYPE.OUT]: 'Salida (Consumo/Embotellado)',
  [MOVEMENT_TYPE.ADJUSTMENT]: 'Ajuste de Inventario (Mermas)',
  [MOVEMENT_TYPE.TRANSFER]: 'Transferencia de Ubicación'
};

export interface Batch {
    id: number;
    batch_number: string;
    material_name: string;
    arrival_date: string;
    expiry_date: string | null;
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
  batch:Batch;
  location:Location;
  quantity: string; // DRF DecimalField viaja como string para evitar pérdidas de precisión en JS
  movement_type: MOVEMENT_TYPE;
  reference_po: number | null;
  reference_po_number?: string;
  user_name: string; // Traducido por el to_representation de tu serializer
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