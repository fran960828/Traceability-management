// src/modules/inventory/constants/reception.constants.tsx
import type { PurchaseOrder } from '../../purchase/models/purchase.schema';
import { PURCHASE_ORDER_STATUS_LABELS } from '../../purchase/models/purchase.schema';
import styles from '../../supplier/components/Supplier.container.module.css';

// ==========================================
// 1. CONFIGURACIÓN DE COLUMNAS DEL MUELLE
// ==========================================
/**
 * Estas columnas se renderizan en el panel principal de recepciones.
 * Filtra y muestra solo órdenes en estado OPEN o PARTIAL pendientes de camión.
 */
export const RECEPTION_COLUMNS_CONFIG = [
  { 
    header: 'Nº Pedido', 
    key: 'order_number' as const 
  },
  { 
    header: 'Proveedor Suministrador', 
    key: 'supplier_name' as const 
  },
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
    render: (item: PurchaseOrder) => {
      // Usamos las clases de badges de tu diseño corporativo
      const isPartial = item.status === 'PARTIAL';
      return (
        <span className={`${styles.badge} ${isPartial ? styles.active : styles.inactive}`}>
          {PURCHASE_ORDER_STATUS_LABELS[item.status] || item.status}
        </span>
      );
    }
  },
];

// ==========================================
// 2. METADATA DE CONTROL DE RECEPCIONES
// ==========================================
export const RECEPTION_PANEL_CONFIG = {
  pageTitle: "Muelle de Recepción de Pedidos",
  searchPlaceholder: "Buscar por número de orden o proveedor...",
  emptyStateMessage: "No hay órdenes de compra pendientes de recibir en el muelle con los filtros actuales.",
  loadingMessage: "Sincronizando órdenes de compra abiertas y parciales con el muelle...",
  modalTitle: "Procesar Entrada de Suministros (Camión)"
};