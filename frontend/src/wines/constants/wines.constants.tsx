// src/modules/wines/constants/wine.constants.tsx
import type { Path } from 'react-hook-form';
import type { WineFormValues, WineMaterial } from '../models/wines.schema';
import type { DetailFieldConfig } from '../../shared/components/detailView/DataGridDetail';
import styles from '../../supplier/components/Supplier.container.module.css';

export interface WineInputConfig {
  name: Path<WineFormValues>; 
  label: string;
  type?: string;
  placeholder?: string;
  halfWidth?: boolean; 
}

// ==========================================
// 1. ESTADO INICIAL COMPATIBLE CON ZOD
// ==========================================
export const DEFAULT_WINE_VALUES: WineFormValues = {
  name: '',
  vintage: 2026,                         // Sugerimos por defecto el año corriente actual de la bodega
  appellation_type: undefined as any,    // Forzamos vaciado inicial para obligar la selección
  appellation_name: '',
  wine_type: undefined as any,
  aging_category: undefined as any,
  varietals: '',
  alcohol_percentage: '',                // String vacío compatible con la validación de Zod
  is_active: true,
  
  // IDs de Claves Foráneas cruzadas hacia el escandallo (se inician limpios)
  default_container: undefined as any,
  default_cork: null,
  default_front_label: null,
  default_back_label: null,
  default_dop_seal: null,
  default_capsule: null,
};

// ==========================================
// 2. CONFIGURACIÓN INPUTS FIJOS DESCRIPTIVOS
// ==========================================
export const WINE_INPUTS_CONFIG: WineInputConfig[] = [
  { 
    name: 'name', 
    label: 'Nombre Comercial del Vino *', 
    placeholder: 'Ej: ONTALBA SELECCIÓN MONASTRELL', 
    halfWidth: false 
  },
  { 
    name: 'vintage', 
    label: 'Añada (Cosecha) *', 
    type: 'number', 
    placeholder: 'Ej: 2026', 
    halfWidth: true 
  },
  { 
    name: 'appellation_name', 
    label: 'Nombre de la D.O. *', 
    placeholder: 'Ej: JUMILLA', 
    halfWidth: true 
  },
  { 
    name: 'alcohol_percentage', 
    label: 'Grado Alcohólico (% Vol) *', 
    type: 'text', 
    placeholder: 'Ej: 14.50', 
    halfWidth: true 
  },
  { 
    name: 'varietals', 
    label: 'Variedades de Uva (Composición) *', 
    placeholder: 'Ej: 60% Monastrell, 40% Syrah...', 
    halfWidth: false 
  },
];

// ==========================================
// 3. COLUMNAS DE LA TABLA GENERAL DE VINOS
// ==========================================
export const WINE_COLUMNS_CONFIG = [
  { header: 'Código WN', key: 'internal_code' as const },
  { header: 'Nombre del Vino', key: 'name' as const },
  { header: 'Añada', key: 'vintage' as const }, 
  { header: 'Tipo', key: 'wine_type_display' as const },
  { header: 'Crianza', key: 'aging_category_display' as const },
  { header: 'Graduación', key: 'alcohol_percentage' as const, render: (item: WineMaterial) => `${item.alcohol_percentage}%` },
  { 
    header: 'Estado', 
    key: 'is_active' as const,
    render: (item: WineMaterial) => (
      <span className={`${styles.badge} ${item.is_active ? styles.active : styles.inactive}`}>
        {item.is_active ? 'Activo' : 'Histórico'}
      </span>
    )
  },
];

// ==========================================
// 4. CONFIGURACIÓN BORRADO MAESTRO
// ==========================================
export const WINE_DELETE_CONFIG = {
  title: "¿Eliminar Ficha Técnica de Vino?",
  codeLabel: "código WN- único",
  impactMessage: "Esta es una acción crítica. Al dar de baja la ficha técnica del vino, las órdenes de embotellado históricas y las proyecciones analíticas de costes de escandallo quedarán congeladas o huérfanas."
};

// ==========================================
// 5. FUNCIÓN PURA PARA GRID DE DETALLE (FICHA TÉCNICA Y ESCANDALLO)
// ==========================================
export const getWineDetailFields = (wineData: WineMaterial): DetailFieldConfig[] => {
  return [
    { label: 'Denominación de Origen', value: `${wineData.appellation_type_display} - ${wineData.appellation_name}` },
    { label: 'Composición de Varietales', value: wineData.varietals },
    { label: 'Categoría de Envejecimiento', value: wineData.aging_category },
    { label: 'Grado Alcohólico Nominal', value: `${wineData.alcohol_percentage}% Vol.` },
    
    // --- LÍNEA DE DETALLE DEL ESCANDALLO ASOCIADO ---
    { label: 'Envase Principal Asignado', value: wineData.container_name || 'No especificado (Requerido para embotellar)' },
    { label: 'Tipo de Cierre / Tapón', value: wineData.cork_name|| 'Sin cierre asignado (Vino Joven / Rosca)' },
    
    { 
      label: 'Sincronización de Componentes', 
      value: `Frontal: ${wineData.default_front_label ? 'Asignada ✔️' : 'Pendiente ❌'} | Contra: ${wineData.default_back_label ? 'Asignada ✔️' : 'Pendiente ❌'}` 
    },
    { 
      label: 'Información de Auditoría', 
      value: `Ficha técnica oficial generada en el sistema (ID Instancia: ${wineData.id}). Los cambios quedan registrados por trazabilidad analítica.`, 
      fullWidth: true, 
      isMeta: true 
    },
  ];
};