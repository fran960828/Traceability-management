import { z } from 'zod';
import { type PaginatedResponse } from '../../reception/models';

// ========================================================
// 📊 ESTADOS ENUMS DE OPERACIÓN
// ========================================================
export type ProductionOrderStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

// ========================================================
// 🏷️ 1. ESQUEMAS DE VALIDACIÓN (ZOD) - ENTRADAS DE FORMULARIO
// ========================================================

/**
 * Esquema de Validación para Insumos Enológicos Añadidos Manualmente.
 * Corresponde a ProductionEnologicalItemSerializer de Django.
 */
export const ProductionEnologicalItemSchema = z.object({
  id: z.number().optional(),
  material: z.coerce.number().int().positive('Debes seleccionar un insumo enológico válido'),
  quantity_used: z.number().positive('La cantidad de insumo debe ser mayor que cero'),
});

/**
 * Esquema de Validación Principal para Partes de Embotellado.
 * Corresponde a ProductionOrderSerializer de Django.
 */
export const ProductionOrderSchema = z.object({
  wine: z.coerce.number().int().positive('Debes seleccionar el vino base a embotellar'),
  production_date: z.string().nonempty('La fecha de embotellado es obligatoria')
    .refine((date) => new Date(date) <= new Date(), {
      message: 'La fecha de embotellado no puede ser futura.',
    }),
  quantity_produced: z.number().int().min(1, 'Debes registrar al menos 1 unidad finalizada (botella/BIB)'),
  lot_number: z.string().trim()
    .min(3, 'El número de lote de producto terminado debe poseer al menos 3 caracteres')
    .max(50, 'El lote no puede exceder los 50 caracteres'),
  bulk_liters_withdrawn: z.number().positive('Los litros reales extraídos del depósito deben ser mayor que cero'),
  notes: z.string().optional().nullable(),
  enological_materials: z.array(ProductionEnologicalItemSchema).default([]),
});

// Tipos tipados de entrada/salida para los formularios React (Hook Form / Formik)
export type ProductionOrderInput = z.input<typeof ProductionOrderSchema>;
export type ProductionOrderOutput = z.output<typeof ProductionOrderSchema>;

export type ProductionEnologicalItemInput = z.input<typeof ProductionEnologicalItemSchema>;

// ========================================================
// 📊 2. INTERFACES DE LECTURA (ESPEJO DE DRF JSON)
// ========================================================

export interface ProductionEnologicalItem {
  id: number;
  material: number;
  material_name: string;
  batch_number:string;
  quantity_used: string;       // Decimal de Django viaja como String
  dosage_per_liter: string;    // Calculado al vuelo por el backend (kg/L)
}

export interface ProductionOrder {
  id: number;
  lot_number: string;
  wine: number;
  wine_name: string;
  user: number;
  user_username: string;
  production_date: string;     // Formato YYYY-MM-DD
  quantity_produced: number;
  status: ProductionOrderStatus;
  status_display: string;      // "Borrador", "Confirmado (Stock descontado)", etc.
  total_liters: string;        // Litros teóricos netos embotellados
  bulk_liters_withdrawn: string; // Litros reales sacados de bodega
  loss_liters: string;         // Mermas líquidas totales en litros
  loss_percentage: number;     // Porcentaje de pérdida (Float)
  notes: string | null;
  enological_materials: ProductionEnologicalItem[];
  created_at: string;
}

// ========================================================
// 🎛️ 3. FILTROS ANALÍTICOS Y RESPUESTAS PAGINADAS
// ========================================================

export type ProductionOrderPaginationResponse = PaginatedResponse<ProductionOrder>;

export interface ProductionOrderFilters {
  page?: string;
  search?: string;       // Barra global (Filtra por lote, vino o notas)
  wine?: string;         // ID de vino específico
  status?: string;       // DRAFT, CONFIRMED, CANCELLED
  date_from?: string;    // Rango de fechas
  date_to?: string;
}