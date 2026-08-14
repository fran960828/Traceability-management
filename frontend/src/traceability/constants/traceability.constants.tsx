// src/modules/traceability/constants/traceability.constants.tsx
import type { LotTraceability } from '../models/traceability.schema';
import type { DetailFieldConfig } from '../../shared/components/detailView/DataGridDetail';
import styles from '../../supplier/components/Supplier.container.module.css';

// 📊 Columnas de la Tabla Principal de Expedientes de Trazabilidad
export const TRACEABILITY_COLUMNS_CONFIG = [
  { header: 'ID Expediente', key: 'id' as const },
  { 
    header: 'Lote de Producción', 
    key: 'id' as const,
    render: (item: LotTraceability) => <strong>{item.content?.order_details?.lot_number || 'N/A'}</strong>
  },
  { 
    header: 'Vino Embotellado', 
    key: 'id' as const,
    render: (item: LotTraceability) => item.content?.order_details?.wine_name || 'Sin especificar'
  },
  { header: 'Fecha de Emisión', key: 'generated_at' as const },
  { 
    header: 'Estado de Firma SHA-256', 
    key: 'integrity_status' as const,
    render: (item: LotTraceability) => {
      const isValid = item.integrity_status?.valid;
      return (
        <span className={`${styles.badge} ${isValid ? styles.active : styles.inactive}`}>
          {isValid ? '🔒 Íntegro (Verificado)' : '⚠️ Alterado'}
        </span>
      );
    }
  },
];

// 👁️ Transformación para la Vista de Detalle Extendida
export const getTraceabilityDetailFields = (record: LotTraceability): DetailFieldConfig[] => {
  const details = record.content?.order_details;
  const recipeCount = record.content?.recipe_materials?.length || 0;
  const enoCount = record.content?.enological_treatments?.length || 0;

  return [
    { label: 'Vino Procesado', value: details?.wine_name || 'N/A' },
    { label: 'Unidades Embotelladas', value: `${details?.quantity_produced?.toLocaleString('es-ES') || 0} botellas` },
    { label: 'Volumen Granel Extraído', value: `${Number(details?.bulk_liters_withdrawn || 0).toFixed(2)} Litros` },
    { label: 'Pérdidas de Bodega', value: `${Number(details?.loss_liters || 0).toFixed(2)} L (${details?.loss_percentage || 0}%)` },
    { label: 'Insumos de Receta Registrados', value: `${recipeCount} insumos base` },
    { label: 'Tratamientos Enológicos', value: `${enoCount} aditivos aplicados` },
    { label: 'Firma Digital SHA-256', value: record.integrity_hash, fullWidth: true },
    { 
      label: 'Auditoría Técnica del Snapshot', 
      value: `Firma digital verificada el ${record.generated_at}. Operador responsable: ${details?.responsible_user || 'Sistema'}.`, 
      fullWidth: true, 
      isMeta: true 
    },
  ];
};