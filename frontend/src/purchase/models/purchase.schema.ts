import { z } from 'zod';

// ==========================================
// 1. ENUMS DEL MODELO DE NEGOCIO (ESTADOS)
// ==========================================

export enum PURCHASE_ORDER_STATUS {
  DRAFT = "DRAFT",          // Borrador (Editable/Modificable)
  OPEN = "OPEN",            // Abierta (Enviada al proveedor, esperando material)
  PARTIAL = "PARTIAL",      // Recibida Parcial (Ha llegado stock, pero no todo)
  CLOSED = "CLOSED",        // Cerrada (Inmutable, todo recibido)
  CANCELLED = "CANCELLED",  // Cancelada (Inmutable)
}

export const PURCHASE_ORDER_STATUS_LABELS: Record<PURCHASE_ORDER_STATUS, string> = {
  [PURCHASE_ORDER_STATUS.DRAFT]: "Borrador",
  [PURCHASE_ORDER_STATUS.OPEN]: "Abierta",
  [PURCHASE_ORDER_STATUS.PARTIAL]: "Recibida Parcial",
  [PURCHASE_ORDER_STATUS.CLOSED]: "Cerrada",
  [PURCHASE_ORDER_STATUS.CANCELLED]: "Cancelada",
};

// ==========================================
// 2. ESQUEMAS DE VALIDACIÓN (ZOD) - LÍNEAS e INTENS
// ==========================================

export const PurchaseOrderItemFormSchema = z.object({
  id: z.number().optional(), // Opcional porque en creación no existe
  
  // Exclusividad mutua: el formulario manejará strings para los dropdowns
  packaging: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  enological: z.string().nullable().optional(),

  quantity_ordered: z.number().int().positive('La cantidad ordenada debe ser mayor a 0'),
  quantity_received: z.number().int().nonnegative().default(0),
  
  // Tratado como string numérico en UI por ser un DecimalField(10,4) en Django
  unit_price: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: 'El precio unitario debe ser un importe positivo mayor a 0' }
  ),
}).superRefine((data, ctx) => {
  // 🔥 VALIDACIÓN "SOLO UNO" EN CALIENTE (Espejo exacto del clean() de Django)
  const fields = [data.packaging, data.label, data.enological];
  const count = fields.filter(field => field !== undefined && field !== null && field !== "").length;

  if (count === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Debe seleccionar un producto (Packaging, Etiqueta o Enológico)",
      path: ["packaging"], // Lo anclamos al primer campo visible
    });
  }
  if (count > 1) {
    ctx.addIssue({
      code: "custom",
      message: "Una línea de pedido solo puede contener un único tipo de producto",
      path: ["packaging"],
    });
  }
});

// ==========================================
// 3. ESQUEMA DE VALIDACIÓN MAESTRO (CABECERA)
// ==========================================

export const PurchaseOrderFormSchema = z.object({
  supplier: z.string().min(1, 'Debe seleccionar un proveedor obligatorio'),
  status: z.enum(Object.values(PURCHASE_ORDER_STATUS) as [string, ...string[]]),
  
  // Fecha esperada de entrega (Formato YYYY-MM-DD para el input type="date")
  date_delivery_expected: z.string().nullable().optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: "Introduce una fecha de entrega válida" }),
    
  notes: z.string().optional(),
  
  // Validación de negocio: No se permiten órdenes vacías (Requisito del Serializer)
  items: z.array(PurchaseOrderItemFormSchema).min(1, 'Una orden de compra debe tener al menos una línea de producto'),
});

export type PurchaseOrderFormValues = z.infer<typeof PurchaseOrderFormSchema>;
export type PurchaseOrderItemFormValues = z.infer<typeof PurchaseOrderItemFormSchema>;

// ==========================================
// 4. MODELOS DE DOMINIO / RESPUESTAS API (GET)
// ==========================================

export interface PurchaseOrderItem {
  id: number;
  purchase_order: number;
  packaging: number | null;
  label: number | null;
  enological: number | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: string;       // Viene como string decimal desde Django ("1.2500")
  material_name: string;   // Atributo @property inyectado por el backend
}

export interface PurchaseOrder {
  id: number;
  order_number: string;     // Código PO-2026-XXXX autogenerado
  supplier: number;         // ID del proveedor asociado
  supplier_name?: string;   // Inyectado por select_related para legibilidad en tablas
  status: PURCHASE_ORDER_STATUS;
  date_issued: string;      // Fecha ISO de creación
  date_delivery_expected: string | null;
  notes: string;
  items: PurchaseOrderItem[]; // Líneas completas incrustadas de forma atómica
}

// Paginación estándar de drf-spectacular para Ontalba Compras
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type PurchaseOrderPaginationResponse = PaginatedResponse<PurchaseOrder>;

// ==========================================
// 5. FILTROS DE NAVEGACIÓN (Sincronizados con ViewSet)
// ==========================================

export interface PurchaseOrderFilters {
  page?: string;
  search?: string;   // Mapea con search_fields = ["order_number", "supplier__name"]
  status?: string;   // Filtrado dinámico por dropdown (DRAFT, OPEN, CLOSED...)
  supplier?: string; // Filtrado por ID de proveedor específico
}