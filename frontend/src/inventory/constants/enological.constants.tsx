
import type { Path } from 'react-hook-form';
import type { EnologicalFormValues, EnologicalMaterial } from '../models/enological.schema';
import type { DetailFieldConfig } from '../../shared/components/detailView/DataGridDetail';
import styles from '../../supplier/components/Supplier.container.module.css';

export interface EnologicalInputConfig {
  name: Path<EnologicalFormValues>; 
  label: string;
  type?: string;
  placeholder?: string;
  halfWidth?: boolean; 
}

// ==========================================
// 1. ESTADO INICIAL COMPATIBLE CON ZOD
// ==========================================
export const DEFAULT_ENOLOGICAL_VALUES: EnologicalFormValues = {
  name: '',
  supplier: undefined as any,         // Forzamos vaciado para obligar la selección en el dropdown
  enological_type: undefined as any,   // Forzamos vaciado para obligar la selección del enum
  commercial_format: '',
  unit_mesure: undefined as any,
  min_stock_level: '',                // String vacío compatible con la validación de Zod
  is_active: true,
  description: '',
};

// ==========================================
// 2. CONFIGURACIÓN INPUTS FIJOS (BUCLE)
// ==========================================
export const ENOLOGICAL_INPUTS_CONFIG: EnologicalInputConfig[] = [
  { 
    name: 'name', 
    label: 'Nombre del Producto *', 
    placeholder: 'Ej: Metabisulfito Potásico Puro', 
    halfWidth: false 
  },
  { 
    name: 'commercial_format', 
    label: 'Formato de Envase *', 
    placeholder: 'Ej: Saco 25kg, Garrafa 20L, Sobre 500g...', 
    halfWidth: false 
  },
  { 
    name: 'min_stock_level', 
    label: 'Nivel de Stock Mínimo *', 
    type: 'text', 
    placeholder: 'Ej: 100.00', 
    halfWidth: true 
  },
];

// ==========================================
// 3. COLUMNAS DE LA TABLA (INVENTARIO)
// ==========================================
export const ENOLOGICAL_COLUMNS_CONFIG = [
  { header: 'Código', key: 'internal_code' as const },
  { header: 'Nombre Producto', key: 'name' as const },
  { header: 'Tipo', key: 'enological_type_display' as const },
  { header: 'Formato Envase', key: 'commercial_format' as const }, 
  { 
    header: 'Stock Actual', 
    key: 'current_stock' as const,
    render: (item: EnologicalMaterial) => (
      <span style={{ fontWeight: item.is_low_stock ? 'bold' : 'normal', color: item.is_low_stock ? '#dc3545' : 'inherit' }}>
        {item.current_stock} {item.unit_mesure_display.toLowerCase()}
        {item.is_low_stock && ' ⚠️'}
      </span>
    )
  },
  { 
    header: 'Estado', 
    key: 'is_active' as const,
    render: (item: EnologicalMaterial) => (
      <span className={`${styles.badge} ${item.is_active ? styles.active : styles.inactive}`}>
        {item.is_active ? 'Activo' : 'Inactivo'}
      </span>
    )
  },
];

// ==========================================
// 4. CONFIGURACIÓN BORRADO GENÉRICO
// ==========================================
export const ENOLOGICAL_DELETE_CONFIG = {
  title: "¿Eliminar Producto Enológico?",
  codeLabel: "código técnico interno",
  impactMessage: "Se dará de baja de forma permanente en el inventario de bodega. Las órdenes de dosificación o registros analíticos activos de los depósitos podrían perder su trazabilidad inmediata."
};

// ==========================================
// 5. FUNCIÓN PURA PARA GRID DE DETALLE
// ==========================================
export const getEnologicalDetailFields = (enologicalData: EnologicalMaterial): DetailFieldConfig[] => {
  return [
    { label: 'Tipología Enológica', value: enologicalData.enological_type_display },
    { label: 'Formato Comercial de Envase', value: enologicalData.commercial_format },
    { label: 'Unidad de Medida', value: enologicalData.unit_mesure_display },
    { label: 'Existencias en Bodega', value: `${enologicalData.current_stock} ${enologicalData.unit_mesure_display.toLowerCase()}` },
    { label: 'Umbral Mínimo de Alerta', value: `${enologicalData.min_stock_level} ${enologicalData.unit_mesure_display.toLowerCase()}` },
    { label: 'Notas de Laboratorio', value: enologicalData.description || 'Sin especificaciones añadidas.', fullWidth: true },
    { 
      label: 'Información de Registro', 
      value: `Registrado el ${new Date(enologicalData.created_at).toLocaleDateString('es-ES')} (ID de Instancia: ${enologicalData.id})`, 
      fullWidth: true, 
      isMeta: true 
    }
  ];
};