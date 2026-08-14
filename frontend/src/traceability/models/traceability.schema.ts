// src/modules/traceability/models/traceability.schema.ts
import { type PaginatedResponse } from '../../reception/models';

// ========================================================
// 🔐 1. ESTADOS DE INTEGRIDAD HASH SHA-256
// ========================================================

export interface IntegrityStatus {
  valid: boolean;
  message: string;
}

// ========================================================
// 📸 2. ESTRUCTURA DEL SNAPSHOT INALTERABLE (JSON FIELD)
// ========================================================

export interface SnapshotOrderDetail {
  id: number;
  lot_number: string;
  wine_name: string;
  production_date: string;
  quantity_produced: number;
  bulk_liters_withdrawn: string;
  total_liters: string;
  loss_liters: string;
  loss_percentage: number;
  responsible_user: string;
}

export interface SnapshotMaterialUsed {
  material_name: string;
  commercial_format?: string;
  batch_number?: string;
  quantity_used: string;
  supplier_name?: string;
}

export interface TraceabilitySnapshotContent {
  order_details: SnapshotOrderDetail;
  recipe_materials: SnapshotMaterialUsed[];
  enological_treatments: SnapshotMaterialUsed[];
  confirmation_timestamp: string;
}

// ========================================================
// 📜 3. ENTIDAD PRINCIPAL DEL EXPEDIENTE DE TRAZABILIDAD
// ========================================================

export interface LotTraceability {
  id: number;
  production_order: number;
  generated_at: string; // Formato "DD/MM/YYYY HH:mm" de DRF
  integrity_status: IntegrityStatus;
  integrity_hash: string;
  content: TraceabilitySnapshotContent;
}

// ========================================================
// 🎛️ 4. FILTROS Y RESPUESTAS PAGINADAS
// ========================================================

export type LotTraceabilityPaginationResponse = PaginatedResponse<LotTraceability>;

export interface LotTraceabilityFilters {
  page?: string | number;
  search?: string;
  lot_number?: string;
  wine_name?: string;
}