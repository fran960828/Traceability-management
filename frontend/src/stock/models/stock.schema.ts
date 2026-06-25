import { z } from 'zod';

import { 
  MOVEMENT_TYPE,   
  type Batch as ReceptionBatch, // Renombrado sutilmente para evitar colisiones si fuera necesario
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
  path: ['destination_location'], 
});

/**
 * Esquema de Validación para Retiradas, Mermas o Ajustes Manuales.
 * Corresponde al `StockAdjustmentSerializer` de Django.
 */
export const StockAdjustmentSchema = z.object({
  batch: z.coerce.number().int().positive('Debes seleccionar un lote válido'),
  location: z.coerce.number().int().positive('La ubicación es obligatoria'),
  quantity: z.number().positive('La cantidad a retirar debe ser mayor que cero.'),
  notes: z.string().min(5, 'Es obligatorio aportar una razón detallada del ajuste/merma (mín. 5 caracteres)'),
});

export type StockTransferInput = z.input<typeof StockTransferSchema>;
export type StockTransferOutput = z.output<typeof StockTransferSchema>;

export type StockAdjustmentInput = z.input<typeof StockAdjustmentSchema>;
export type StockAdjustmentOutput = z.output<typeof StockAdjustmentSchema>;


// ========================================================
// 📊 2. INTERFACES DE LECTURA (ESPEJOS DE DJANGO REST)
// ========================================================

/**
 * Espejo exacto del StockMovementSerializer de Django REST Framework (Histórico / Libro Diario)
 */
export interface StockMovement {
  id: number;
  batch: number;                  
  batch_detail?: ReceptionBatch;       
  batch_number: string;           
  product_name: string;
  batch_current_stock: string;           
  location: number;               
  location_name: string;          
  quantity: string;               
  movement_type: MOVEMENT_TYPE;   
  movement_type_display: string; 
  reference_po: number | null;
  user: number;
  user_full_name: string;         
  created_at: string;
  notes: string;
}

/**
 * 🟢 NUEVA INTERFAZ: Espejo exacto del nuevo BatchSerializer de Django.
 * Representa un Lote único con existencias vivas remanentes en bodega.
 */
export interface AvailableBatch {
  id: number;
  batch_number: string;
  product_name: string;
  supplier_name: string;
  location: number | null;        // ID de la ubicación real actual calculada
  location_name: string;          // Nombre legible de la zona (ej: "Cámara Almacén")
  current_stock_cache: string;    // Saldo real vivo en la base de datos (String por Decimal de Django)
  stock_status: 'AVAILABLE' | 'DEPLETED';
  stock_status_display: string;   // Texto traducido (ej: "En Existencias")
  arrival_date: string;           // Fecha ISO (YYYY-MM-DD)
  expiry_date: string | null;     // Fecha ISO o null si no caduca
}

// ========================================================
// 🎛️ 3. RESPUESTAS PAGINADAS Y FILTROS ANALÍTICOS
// ========================================================

export type StockMovementPaginationResponse = PaginatedResponse<StockMovement>;

/**
 * 🟢 NUEVA RESPUESTA PAGINADA: Tipado estricto para las consultas a 'stock/batch/'
 */
export type AvailableStockPaginationResponse = PaginatedResponse<AvailableBatch>;

export interface StockMovementFilters {
  page?: string;
  search?: string; 
  movement_type?: string;
  supplier?: string;
  product_name?: string;
  location?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * 🟢 NUEVOS FILTROS EXCLUSIVOS: Tipado para la pestaña de Existencias Disponibles (Inventory)
 * Evita contaminar la API con tipos de movimientos, rangos de fechas de auditoría, etc.
 */
export interface AvailableStockFilters {
  page?: string;
  search?: string;      // Barra de búsqueda global de la UI
  supplier?: string;    // ID del Proveedor
  product_name?: string;// Nombre del artículo
  location?: string;    // ID de la zona o almacén físico
}