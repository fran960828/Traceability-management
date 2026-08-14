// src/modules/pricing/models/indirectCost.schema.ts
import { z } from 'zod';

// ==========================================
// 1. ESQUEMAS DE VALIDACIÓN (ZOD)
// ==========================================

export const IndirectCostConfigSchema = z.object({
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres (ej: Tasas Generales 2026)'),
  
  // Tasas unitarias expresadas con precisión de 4 decimales
  labor_rate: z.coerce
    .number()
    .min(0, 'La tasa de mano de obra no puede ser negativa')
    .max(1, 'La tasa no puede superar 1.0000 €/unidad'),
    
  energy_rate: z.coerce
    .number()
    .min(0, 'La tasa de energía no puede ser negativa')
    .max(1, 'La tasa no puede superar 1.0000 €/unidad'),
    
  amortization_rate: z.coerce
    .number()
    .min(0, 'La tasa de amortización no puede ser negativa')
    .max(1, 'La tasa no puede superar 1.0000 €/unidad'),

  is_active: z.boolean().default(true),
});

export type IndirectCostConfigFormValues = z.infer<typeof IndirectCostConfigSchema>;

// ==========================================
// 2. MODELOS DE DOMINIO / RESPUESTAS API
// ==========================================

// Objeto completo retornado por el ViewSet de DRF
export interface IndirectCostConfig {
  id: number;
  name: string;
  labor_rate: string | number;
  energy_rate: string | number;
  amortization_rate: string | number;
  is_active: boolean;
  created_at: string;
}

// Estructura de respuesta paginada genérica de DRF
export interface IndirectCostConfigPaginationResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: IndirectCostConfig[];
}

// ==========================================
// 3. FILTROS DE NAVEGACIÓN
// ==========================================

export interface IndirectCostFilters {
  page?: number;
  search?: string;
  is_active?: boolean;
}