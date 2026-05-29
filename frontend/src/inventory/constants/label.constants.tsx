import type { Path } from 'react-hook-form';
import { type LabelFormValues } from '../models/label.schema';
import type { LabelMaterial } from '../models/label.schema';
import type { DetailFieldConfig } from '../../shared/components/detailView/DataGridDetail';
import styles from '../../supplier/components/Supplier.container.module.css';

export interface LabelInputConfig {
  name: Path<LabelFormValues>; 
  label: string;
  type?: string;
  placeholder?: string;
  halfWidth?: boolean; 
}

// ==========================================
// 1. ESTADO INICIAL COMPATIBLE CON ZOD
// ==========================================
export const DEFAULT_LABEL_VALUES: LabelFormValues = {
  name: '',
  supplier: undefined as any,     // Forzamos vaciado inicial para el select de proveedores
  label_type: undefined as any,   // Forzamos vaciado inicial para el select enum
  brand_reference: '',
  vintage: new Date().getFullYear(), // Sugerimos el año en curso por defecto en la bodega
  unit_mesure: undefined as any,  // Forzamos vaciado inicial para el select enum
  min_stock_level: '',            // String vacío compatible con la validación .refine() de Zod
  is_active: true,
  description: '',
};

// ==========================================
// 2. CONFIGURACIÓN ESTRUCTURAL DEL GRID (INPUTS)
// ==========================================
export const LABEL_INPUTS_CONFIG: LabelInputConfig[] = [
  { 
    name: 'name', 
    label: 'Nombre de la Etiqueta *', 
    placeholder: 'Ej: Etiqueta Frontal Ontalba Crianza', 
    halfWidth: false // Ocupa todo el ancho por ser el identificador descriptivo
  },
  { 
    name: 'brand_reference', 
    label: 'Referencia de Marca (Vino) *', 
    placeholder: 'Ej: Ontalba Tempranillo Selección', 
    halfWidth: true 
  },
  { 
    name: 'vintage', 
    label: 'Añada (Año) *', 
    type: 'number', 
    placeholder: 'Ej: 2026', 
    halfWidth: true 
  },
  { 
    name: 'min_stock_level', 
    label: 'Nivel de Stock Mínimo *', 
    type: 'text', // Usamos text para permitir el flujo limpio con el string de Zod
    placeholder: 'Ej: 1500.00', 
    halfWidth: true 
  },
];




// 📊 Configuración de las Columnas de la Tabla de Inventario
export const LABEL_COLUMNS_CONFIG = [
  { header: 'Código', key: 'internal_code' as const },
  { header: 'Nombre Material', key: 'name' as const },
  { header: 'Referencia Vino', key: 'brand_reference' as const },
  { header: 'Añada', key: 'vintage' as const }, 
  { header: 'Posición', key: 'label_type_display' as const },
  { 
    header: 'Stock Actual', 
    key: 'current_stock' as const,
    render: (item: LabelMaterial) => (
      <span style={{ fontWeight: item.is_low_stock ? 'bold' : 'normal', color: item.is_low_stock ? '#dc3545' : 'inherit' }}>
        {item.current_stock} {item.unit_mesure_display.toLowerCase()}
        {item.is_low_stock && ' ⚠️'}
      </span>
    )
  },
  { 
    header: 'Estado', 
    key: 'is_active' as const,
    render: (item: LabelMaterial) => (
      <span className={`${styles.badge} ${item.is_active ? styles.active : styles.inactive}`}>
        {item.is_active ? 'Activo' : 'Inactivo'}
      </span>
    )
  },
];

// 🔧 Objeto de Configuración para el Borrado Genérico de Materiales
export const LABEL_DELETE_CONFIG = {
  title: "¿Eliminar Etiqueta?",
  codeLabel: "código",
  impactMessage: "Los registros de stock históricos y las órdenes de embotellado asociadas a este material podrían verse afectados o quedar congelados."
};

// 👁️ Función Pura para transformar el material en las filas del Grid de Detalle
export const getLabelDetailFields = (labelData: LabelMaterial): DetailFieldConfig[] => {
  return [
    { label: 'Referencia de Marca / Vino', value: labelData.brand_reference },
    { label: 'Añada / Cosecha', value: String(labelData.vintage) },
    { label: 'Posición de Etiqueta', value: labelData.label_type_display },
    { label: 'Unidad de Medida', value: labelData.unit_mesure_display },
    { 
      label: 'Existencias Actuales', 
      value: `${labelData.current_stock} ${labelData.unit_mesure_display.toLowerCase()}` 
    },
    { 
      label: 'Nivel de Stock Mínimo', 
      value: `${labelData.min_stock_level} ${labelData.unit_mesure_display.toLowerCase()}` 
    },
    { 
      label: 'Descripción Técnica', 
      value: labelData.description || 'Sin descripción adicional.', 
      fullWidth: true 
    },
    { 
      label: 'Información de Registro', 
      value: `Dado de alta el ${new Date(labelData.created_at).toLocaleDateString('es-ES')} (ID Interno: ${labelData.id})`, 
      fullWidth: true, 
      isMeta: true 
    },
  ];
};