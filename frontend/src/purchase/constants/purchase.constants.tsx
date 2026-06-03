// src/modules/purchase/constants/purchase.constants.tsx
import type { Path } from 'react-hook-form';
import { 
  type PurchaseOrderFormValues, 
  type PurchaseOrder,  
  PURCHASE_ORDER_STATUS, 
  PURCHASE_ORDER_STATUS_LABELS 
} from '../models/purchase.schema';
import type { DetailFieldConfig } from '../../shared/components/detailView/DataGridDetail';
import styles from '../../supplier/components/Supplier.container.module.css';

export interface PurchaseInputConfig {
  name: Path<PurchaseOrderFormValues>; 
  label: string;
  type?: string;
  placeholder?: string;
  halfWidth?: boolean; 
}

// ==========================================
// 1. ESTADO INICIAL COMPATIBLE CON ZOD
// ==========================================
export const DEFAULT_PURCHASE_ORDER_VALUES: PurchaseOrderFormValues = {
  supplier: '',                          // ID del proveedor forzado a string vacío para obligar selección
  status: PURCHASE_ORDER_STATUS.DRAFT,   // Por defecto nace en Borrador
  date_delivery_expected: '',            // Input tipo date vacío
  notes: '',
  items: [],                             // El array de líneas arranca vacío
};

// ==========================================
// 2. CONFIGURACIÓN INPUTS FIJOS DE CABECERA
// ==========================================
export const PURCHASE_ORDER_INPUTS_CONFIG: PurchaseInputConfig[] = [
  { 
    name: 'date_delivery_expected', 
    label: 'Fecha de Entrega Estimada', 
    type: 'date', 
    halfWidth: true 
  },
  { 
    name: 'notes', 
    label: 'Observaciones / Notas de Compra', 
    placeholder: 'Ej: Embalaje en palets americanos, entregar en horario de mañana, condiciones de pago incoterm...', 
    halfWidth: false 
  },
];

// ==========================================
// 3. ESTILOS DINÁMICOS PARA BADGES DE ESTADO
// ==========================================
// Mapeo semántico para pintar las alertas visuales según dicte Django
export const getStatusBadgeClass = (status: PURCHASE_ORDER_STATUS): string => {
  switch (status) {
    case PURCHASE_ORDER_STATUS.DRAFT:
      return styles.inactive; // Gris / Neutral
    case PURCHASE_ORDER_STATUS.OPEN:
      return styles.active;   // Verde claro / En tránsito
    case PURCHASE_ORDER_STATUS.PARTIAL:
      return styles.pending;  // Naranja / Incompleto
    case PURCHASE_ORDER_STATUS.CLOSED:
      return styles.verified; // Azul o Verde oscuro (si tu CSS lo soporta, o mapea al activo)
    case PURCHASE_ORDER_STATUS.CANCELLED:
      return styles.blocked;  // Rojo / Cancelado
    default:
      return styles.inactive;
  }
};

// ==========================================
// 4. COLUMNAS DE LA TABLA GENERAL DE ÓRDENES
// ==========================================
export const PURCHASE_ORDER_COLUMNS_CONFIG = [
  { header: 'Nº Orden', key: 'order_number' as const },
  { header: 'Proveedor', key: 'supplier_name' as const }, 
  { 
    header: 'Fecha Emisión', 
    key: 'date_issued' as const,
    render: (item: PurchaseOrder) => new Date(item.date_issued).toLocaleDateString('es-ES')
  },
  { 
    header: 'Entrega Prevista', 
    key: 'date_delivery_expected' as const,
    render: (item: PurchaseOrder) => item.date_delivery_expected 
      ? new Date(item.date_delivery_expected).toLocaleDateString('es-ES') 
      : 'No acordada'
  },
  {
    header: 'Líneas',
    key: 'items' as const,
    render: (item: PurchaseOrder) => `${item.items?.length || 0} art.`
  },
  { 
    header: 'Estado', 
    key: 'status' as const,
    render: (item: PurchaseOrder) => (
      <span className={`${styles.badge} ${getStatusBadgeClass(item.status)}`}>
        {PURCHASE_ORDER_STATUS_LABELS[item.status]}
      </span>
    )
  },
];

// ==========================================
// 5. CONFIGURACIÓN BORRADO / CANCELACIÓN
// ==========================================
export const PURCHASE_DELETE_CONFIG = {
  title: "¿Eliminar Orden de Compra?",
  codeLabel: "código PO- único",
  impactMessage: "Esta acción es irreversible. Solo se pueden eliminar órdenes en estado Borrador o Abierta. Si el material ya ha tocado el stock físico, la orden deberá cerrarse o cancelarse para mantener la consistencia de la auditoría."
};

// ==========================================
// 6. DETALLES DE CABECERA Y RESUMEN DE LÍNEAS
// ==========================================
export const getPurchaseOrderDetailFields = (order: PurchaseOrder): DetailFieldConfig[] => {
  // Calculamos el coste total teórico del pedido sumando las líneas
  const totalImporte = order.items?.reduce((acc, item) => {
    return acc + (item.quantity_ordered * Number(item.unit_price));
  }, 0) || 0;

  // Calculamos el porcentaje de recepción global del pedido
  const totalOrdenado = order.items?.reduce((acc, item) => acc + item.quantity_ordered, 0) || 0;
  const totalRecibido = order.items?.reduce((acc, item) => acc + item.quantity_received, 0) || 0;
  const porcentajeRecepcion = totalOrdenado > 0 ? ((totalRecibido / totalOrdenado) * 100).toFixed(1) : "0.0";

  return [
    { label: 'Proveedor Homologado', value: order.supplier_name || `ID Sistema: ${order.supplier}` },
    { label: 'Fecha de Emisión Oficial', value: new Date(order.date_issued).toLocaleString('es-ES') },
    { label: 'Plazo de Entrega Pactado', value: order.date_delivery_expected ? new Date(order.date_delivery_expected).toLocaleDateString('es-ES') : 'Sin fecha límite especificada' },
    { label: 'Valoración Económica Total', value: `${totalImporte.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` },
    { label: 'Estado de Recepción Física', value: `${totalRecibido} de ${totalOrdenado} unidades controladas (${porcentajeRecepcion}%)` },
    { label: 'Notas de la Adquisición', value: order.notes || 'Sin observaciones comerciales adjuntas en la orden.', fullWidth: true },
    { 
      label: 'Trazabilidad y Auditoría Corporativa', 
      value: `Registro transaccional atómico inmutable. ID de Instancia DRF: ${order.id}. Estado de edición: ${order.status === PURCHASE_ORDER_STATUS.CLOSED ? 'BLOQUEADO/ARCHIVADO 🔒' : 'EDITABLE 🔓'}.`, 
      fullWidth: true, 
      isMeta: true 
    },
  ];
};