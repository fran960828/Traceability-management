import { type StockMovement } from '../models/stock.schema';
import {  MOVEMENT_TYPE, MOVEMENT_TYPE_LABELS } from '../../reception/models';
import type { DetailFieldConfig } from '../../shared/components/detailView/DataGridDetail';
import styles from '../../supplier/components/Supplier.container.module.css';

// Mapeo semántico de colores corporativos para los movimientos de stock
export const getMovementBadgeClass = (type: MOVEMENT_TYPE): string => {
  switch (type) {
    case MOVEMENT_TYPE.IN:
      return styles.active;    // Verde: Entrada de mercancía
    case MOVEMENT_TYPE.OUT:
      return styles.blocked;   // Rojo: Salida o consumo
    case MOVEMENT_TYPE.TRANSFER:
      return styles.verified;  // Azul: Reubicación interna
    case MOVEMENT_TYPE.ADJUSTMENT:
      return styles.pending;   // Naranja: Regularización / Descuadre
    default:
      return styles.inactive;
  }
};

export const STOCK_MOVEMENT_COLUMNS_CONFIG = [
  { 
    header: 'Fecha / Hora', 
    key: 'created_at' as const,
    render: (item: StockMovement) => new Date(item.created_at).toLocaleString('es-ES')
  },
  { header: 'Tipo', key: 'movement_type' as const,
    render: (item: StockMovement) => (
      <span className={`${styles.badge} ${getMovementBadgeClass(item.movement_type)}`}>
        {MOVEMENT_TYPE_LABELS[item.movement_type]}
      </span>
    )
  },
  { header: 'Material / Insumo', key: 'product_name' as const },
  { header: 'Lote Físico', key: 'batch_number' as const },
  { header: 'Ubicación', key: 'location_name' as const },
  { 
    header: 'Cantidad', 
    key: 'quantity' as const,
    render: (item: StockMovement) => {
      const qty = Number(item.quantity);
      const isPositive = qty > 0;
      return (
        <strong style={{ color: isPositive ? '#16a34a' : '#dc2626' }}>
          {isPositive ? `+${qty.toFixed(3)}` : qty.toFixed(3)}
        </strong>
      );
    }
  },
  { header: 'Responsable', key: 'user_full_name' as const }
];

export const getStockMovementDetailFields = (movement: StockMovement): DetailFieldConfig[] => [
  { label: 'Identificador Interno (ID)', value: String(movement.id) },
  { label: 'Tipo de Operación registrada', value: MOVEMENT_TYPE_LABELS[movement.movement_type] },
  { label: 'Material o Artículo Enológico', value: movement.product_name },
  { label: 'Código de Lote del Proveedor', value: movement.batch_number },
  { label: 'Zona Física / Almacén de Destino', value: movement.location_name },
  { 
    label: 'Variación Neta de Existencias', 
    value: `${Number(movement.quantity) > 0 ? '+' : ''}${Number(movement.quantity).toFixed(3)} unidades` 
  },
  { label: 'Orden de Compra Asociada', value: movement.reference_po ? `ID Orden: ${movement.reference_po}` : 'Ajuste Manual sin OC de Origen' },
  { label: 'Usuario Responsable (Muelle)', value: movement.user_full_name || `ID Usuario: ${movement.user}` },
  { label: 'Justificación / Informe de Auditoría', value: movement.notes || 'Operación ordinaria sin notas adicionales.', fullWidth: true },
  { 
    label: 'Trazabilidad Sanitaria y Calidad', 
    value: `Este registro transaccional es estrictamente inmutable (Fecha oficial: ${new Date(movement.created_at).toLocaleString('es-ES')}). Cualquier descuadre físico debe resolverse mediante una nueva acción correctora.`, 
    fullWidth: true, 
    isMeta: true 
  }
];