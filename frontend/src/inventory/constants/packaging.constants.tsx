// src/modules/inventory/constants/packaging.constants.tsx
import type { Path } from 'react-hook-form';
import type { PackagingFormValues, PackagingMaterial } from '../models/packaging.schema';
import type { DetailFieldConfig } from '../../shared/components/detailView/DataGridDetail';
import styles from '../../supplier/components/Supplier.container.module.css';

export interface PackagingInputConfig {
  name: Path<PackagingFormValues>; 
  label: string;
  type?: string;
  placeholder?: string;
  halfWidth?: boolean; 
}

// ==========================================
// 1. ESTADO INICIAL COMPATIBLE CON ZOD
// ==========================================
export const DEFAULT_PACKAGING_VALUES: PackagingFormValues = {
  name: '',
  supplier: undefined as any,       // Forzamos vaciado para obligar la selección en el dropdown
  packaging_type: undefined as any, // Forzamos vaciado para obligar la selección del enum
  specification: '',
  color: '',                        // Arranca vacío, controlado por el formulario si es VIDRIO/CAPSULA
  capacity: '',                     // Arranca vacío, controlado por el formulario si es contenedor
  unit_mesure: undefined as any,
  min_stock_level: '',              // String vacío compatible con la validación de Zod
  is_active: true,
  description: '',
};

// ==========================================
// 2. CONFIGURACIÓN INPUTS FIJOS (BUCLE)
// ==========================================
// Nota: 'color' y 'capacity' se renderizan manualmente en el formulario de forma condicional (Opción A)
export const PACKAGING_INPUTS_CONFIG: PackagingInputConfig[] = [
  { 
    name: 'name', 
    label: 'Nombre del Material *', 
    placeholder: 'Ej: Botella Vidrio Modelo Élite Reserva', 
    halfWidth: false 
  },
  { 
    name: 'specification', 
    label: 'Especificación Técnica *', 
    placeholder: 'Ej: 75cl, Caja 6 bot, Corcho 44x24mm...', 
    halfWidth: false 
  },
  { 
    name: 'min_stock_level', 
    label: 'Nivel de Stock Mínimo *', 
    type: 'text', 
    placeholder: 'Ej: 2500.00', 
    halfWidth: true 
  },
];

// ==========================================
// 3. COLUMNAS DE LA TABLA (INVENTARIO)
// ==========================================
export const PACKAGING_COLUMNS_CONFIG = [
  { header: 'Código', key: 'internal_code' as const },
  { header: 'Nombre Material', key: 'name' as const },
  { header: 'Tipo', key: 'packaging_type_display' as const },
  { header: 'Especificación', key: 'specification' as const }, 
  { 
    header: 'Stock Actual', 
    key: 'current_stock' as const,
    render: (item: PackagingMaterial) => (
      <span style={{ fontWeight: item.is_low_stock ? 'bold' : 'normal', color: item.is_low_stock ? '#dc3545' : 'inherit' }}>
        {item.current_stock} {item.unit_mesure_display.toLowerCase()}
        {item.is_low_stock && ' ⚠️'}
      </span>
    )
  },
  { 
    header: 'Estado', 
    key: 'is_active' as const,
    render: (item: PackagingMaterial) => (
      <span className={`${styles.badge} ${item.is_active ? styles.active : styles.inactive}`}>
        {item.is_active ? 'Activo' : 'Inactivo'}
      </span>
    )
  },
];

// ==========================================
// 4. CONFIGURACIÓN BORRADO GENÉRICO
// ==========================================
export const PACKAGING_DELETE_CONFIG = {
  title: "¿Eliminar Material de Acondicionamiento?",
  codeLabel: "código de barras técnico",
  impactMessage: "Se dará de baja de forma permanente en el almacén seco. Los históricos de inventario y las órdenes de preparación vigentes podrían sufrir descuadres operativos."
};

// ==========================================
// 5. FUNCIÓN PURA PARA GRID DE DETALLE
// ==========================================
export const getPackagingDetailFields = (packagingData: PackagingMaterial): DetailFieldConfig[] => {
  const fields: DetailFieldConfig[] = [
    { label: 'Tipo de Material', value: packagingData.packaging_type_display },
    { label: 'Especificación Técnica', value: packagingData.specification },
  ];

  // Inyectamos condicionalmente en la ficha técnica de lectura solo si aplican por negocio
  if (packagingData.capacity) {
    fields.push({ label: 'Capacidad Nominal', value: `${packagingData.capacity} Litros` });
  }
  
  if (packagingData.color) {
    fields.push({ label: 'Color de Fabricación', value: packagingData.color });
  }

  // Agregamos la cola común de campos de inventario y el metaCard de auditoría
  fields.push(
    { label: 'Unidad de Medida', value: packagingData.unit_mesure_display },
    { label: 'Existencias en Almacén', value: `${packagingData.current_stock} ${packagingData.unit_mesure_display.toLowerCase()}` },
    { label: 'Umbral de Alerta Mínimo', value: `${packagingData.min_stock_level} ${packagingData.unit_mesure_display.toLowerCase()}` },
    { label: 'Notas Adicionales', value: packagingData.description || 'Sin comentarios registrados.', fullWidth: true },
    { 
      label: 'Información de Registro', 
      value: `Dado de alta en el sistema el ${new Date(packagingData.created_at).toLocaleDateString('es-ES')} (ID de Instancia: ${packagingData.id})`, 
      fullWidth: true, 
      isMeta: true 
    }
  );

  return fields;
};