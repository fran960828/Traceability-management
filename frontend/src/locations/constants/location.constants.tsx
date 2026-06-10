// src/modules/inventory/constants/location.constants.tsx
import type { Path } from 'react-hook-form';
import type { LocationFormValues, Location } from '../models/location.schema';
import type { DetailFieldConfig } from '../../shared/components/detailView/DataGridDetail';
import styles from '../../supplier/components/Supplier.container.module.css'; 

export interface LocationInputConfig {
  name: Path<LocationFormValues>; 
  label: string;
  type?: string;
  placeholder?: string;
  halfWidth?: boolean; 
}

// ==========================================
// 1. ESTADO INICIAL COMPATIBLE CON ZOD
// ==========================================
export const DEFAULT_LOCATION_VALUES: LocationFormValues = {
  name: '',
  description: '',
  is_active: true,
};

// ==========================================
// 2. CONFIGURACIÓN INPUTS FIJOS DESCRIPTIVOS
// ==========================================
export const LOCATION_INPUTS_CONFIG: LocationInputConfig[] = [
  { 
    name: 'name', 
    label: 'Nombre / Identificador de la Ubicación *', 
    placeholder: 'Ej: ALMACEN_GENERAL o BODEGA_FINAL', 
    halfWidth: false 
  },
  { 
    name: 'description', 
    label: 'Descripción Técnica / Notas de la Zona', 
    placeholder: 'Ej: Nave regulada a 14°C para la conservación óptima de materias primas...', 
    halfWidth: false 
  },
];

// ==========================================
// 3. COLUMNAS DE LA TABLA GENERAL DE UBICACIONES
// ==========================================
export const LOCATION_COLUMNS_CONFIG = [
  { header: 'ID', key: 'id' as const },
  { header: 'Código de Ubicación', key: 'name' as const },
  { header: 'Descripción', key: 'description' as const },
  { 
    header: 'Estado Operativo', 
    key: 'is_active' as const,
    render: (item: Location) => (
      <span className={`${styles.badge} ${item.is_active ? styles.active : styles.inactive}`}>
        {item.is_active ? 'Disponible' : 'Inactiva'}
      </span>
    )
  },
];

// ==========================================
// 4. CONFIGURACIÓN BORRADO MAESTRO
// ==========================================
export const LOCATION_DELETE_CONFIG = {
  title: "¿Eliminar Zona de Almacenamiento?",
  codeLabel: "código identificador",
  impactMessage: "Esta es una acción crítica de control de existencias. Si eliminas esta localización, asegúrate de que no contenga lotes o saldos de stock residuales, o la consistencia de la auditoría se verá afectada."
};

// ==========================================
// 5. FUNCIÓN PURA PARA GRID DE DETALLE VISTA RAPIDA
// ==========================================
export const getLocationDetailFields = (location: Location): DetailFieldConfig[] => {
  return [
    { label: 'Ubicación Técnica', value: location.name },
    { label: 'Especificaciones de la Zona', value: location.description || 'Sin observaciones descriptivas añadidas.' },
    { label: 'Fecha de Alta en Sistema', value: new Date(location.created_at).toLocaleDateString('es-ES') },
    { 
      label: 'Información de Auditoría y Control', 
      value: `Registro transaccional inmutable. ID de Instancia DB: ${location.id}. Estado de uso actual: ${location.is_active ? 'HABILITADA PARA RECIBIR STOCK ✔️' : 'BLOQUEADA TEMPORALMENTE ❌'}.`, 
      fullWidth: true, 
      isMeta: true 
    },
  ];
};