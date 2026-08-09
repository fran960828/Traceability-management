import { type ProductionOrder } from '../models/productionRecord.schema';
import type { DetailFieldConfig } from '../../shared/components/detailView/DataGridDetail';
import styles from '../../supplier/components/Supplier.container.module.css';

/**
 * 🎨 Mapeo semántico de colores corporativos según el estado del parte de embotellado.
 */
export const getProductionStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'DRAFT':
      return styles.pending;     // Naranja: Borrador / Modificable
    case 'CONFIRMED':
      return styles.active;      // Verde: Confirmado (Cierre de stock y FIFO ejecutado)
    case 'CANCELLED':
      return styles.blocked;     // Rojo: Anulado (Sin impacto en stock)
    default:
      return styles.inactive;    // Gris: Estado desconocido
  }
};

/**
 * 📊 Configuración de columnas para el listado principal de Partes de Producción
 */
export const PRODUCTION_ORDER_COLUMNS_CONFIG = [
  { 
    header: 'Fecha / Hora', 
    key: 'created_at' as const,
    render: (item: ProductionOrder) => new Date(item.created_at).toLocaleString('es-ES')
  },
  { 
    header: 'Estado', 
    key: 'status' as const,
    render: (item: ProductionOrder) => (
      <span className={`${styles.badge} ${getProductionStatusBadgeClass(item.status)}`}>
        {/* 🟢 Usamos el string que ya viene formateado e internacionalizado por Django */}
        {item.status_display}
      </span>
    )
  },
  { header: 'Vino Base', key: 'wine_name' as const },
  { header: 'Lote Final Embotellado', key: 'lot_number' as const },
  { 
    header: 'Botellas Producidas', 
    key: 'quantity_produced' as const,
    render: (item: ProductionOrder) => (
      <strong>{Number(item.quantity_produced).toLocaleString('es-ES')} ud</strong>
    )
  },
  { 
    header: 'Litros Retirados', 
    key: 'total_liters' as const,
    render: (item: ProductionOrder) => `${Number(item.total_liters).toFixed(2)} L`
  },
  { 
    header: 'Merma (%)', 
    key: 'loss_percentage' as const,
    render: (item: ProductionOrder) => {
      const percentage = Number(item.loss_percentage);
      const isHighLoss = percentage > 2.0; // Alerta si se pierde más del 2% del volumen
      return (
        <span style={{ color: isHighLoss ? '#dc2626' : 'inherit', fontWeight: isHighLoss ? 'bold' : 'normal' }}>
          {percentage.toFixed(2)}%
        </span>
      );
    }
  }
];

/**
 * 🔍 Ficha técnica y auditoría del Parte de Embotellado para la vista de detalle
 */
export const getProductionOrderDetailFields = (order: ProductionOrder): DetailFieldConfig[] => [
  { label: 'Identificador del Parte (ID)', value: String(order.id) },
  { label: 'Estado del Registro', value: order.status_display },
  { label: 'Vino Varietal Retirado', value: order.wine_name },
  { label: 'Código de Lote Asignado', value: order.lot_number || 'No asignado (Borrador)' },
  { label: 'Fecha Oficial de Operación', value: order.production_date ? new Date(order.production_date).toLocaleDateString('es-ES') : 'Pendiente' },
  { label: 'Unidades / Botellas Finales', value: `${Number(order.quantity_produced).toLocaleString('es-ES')} botellas` },
  { label: 'Volumen Neto Consumido', value: `${Number(order.bulk_liters_withdrawn).toFixed(2)} litros de granel` },
  { label: 'Pérdidas Reales en Línea', value: `${Number(order.loss_liters).toFixed(2)} litros (${Number(order.loss_percentage).toFixed(2)}%)` },
  { 
    label: 'Insumos Enológicos Utilizados', 
    value: order.enological_materials?.length 
      ? order.enological_materials.map(m => (
          `${m.material_name} (${m.batch_number}) - ${Number(m.quantity_used).toFixed(3)} uds`
        )).join(', ')
      : 'Sin materias primas secundarias registradas.',
    fullWidth: true 
  },
  { label: 'Notas de Producción / Incidencias', value: order.notes || 'Operación ordinaria sin incidencias en la línea de llenado.', fullWidth: true },
  { 
    label: 'Cláusula de Trazabilidad e Inmutabilidad alimentaria', 
    value: order.status === 'CONFIRMED'
      ? `Este registro ha sido FIRMADO y CERRADO. Se ha descontado automáticamente el vino base de las cubas y las materias primas del inventario aplicando estrictamente las reglas de rotación FIFO (Fecha: ${new Date(order.created_at).toLocaleString('es-ES')}).`
      : 'Este registro se encuentra en modo BORRADOR. Los stocks e inventarios físicos no sufrirán alteraciones hasta que un supervisor confirme el documento.', 
    fullWidth: true, 
    isMeta: true 
  }
];