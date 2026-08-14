// src/modules/pricing/constants/indirectCost.constants.tsx
import type { Path } from 'react-hook-form';
import { type IndirectCostConfigFormValues, type IndirectCostConfig } from '../models/indirectCost.schema';
import type { DetailFieldConfig } from '../../shared/components/detailView/DataGridDetail';
import styles from '../../supplier/components/Supplier.container.module.css';

export interface IndirectCostInputConfig {
  name: Path<IndirectCostConfigFormValues>;
  label: string;
  type?: string;
  placeholder?: string;
  halfWidth?: boolean;
}

export const DEFAULT_INDIRECT_COST_VALUES: IndirectCostConfigFormValues = {
  name: '',
  labor_rate: 0,
  energy_rate: 0,
  amortization_rate: 0,
  is_active: true,
};

export const INDIRECT_COST_INPUTS_CONFIG: IndirectCostInputConfig[] = [
  { 
    name: 'name', 
    label: 'Nombre de la Configuración *', 
    placeholder: 'Ej: Tasas Generales 2026', 
    halfWidth: false 
  },
  { 
    name: 'labor_rate', 
    label: 'Mano de Obra (€/unidad) *', 
    type: 'number', 
    placeholder: '0.1200', 
    halfWidth: true 
  },
  { 
    name: 'energy_rate', 
    label: 'Energía y Suministros (€/unidad) *', 
    type: 'number', 
    placeholder: '0.0450', 
    halfWidth: true 
  },
  { 
    name: 'amortization_rate', 
    label: 'Amortización de Maquinaria (€/unidad) *', 
    type: 'number', 
    placeholder: '0.0800', 
    halfWidth: true 
  },
];

// 📊 Configuración de las Columnas de la Tabla Principal
export const INDIRECT_COST_COLUMNS_CONFIG = [
  { header: 'ID', key: 'id' as const },
  { header: 'Configuración / Ejercicio', key: 'name' as const },
  { 
    header: 'Mano de Obra', 
    key: 'labor_rate' as const,
    render: (item: IndirectCostConfig) => `${Number(item.labor_rate).toFixed(4)} €`
  },
  { 
    header: 'Energía', 
    key: 'energy_rate' as const,
    render: (item: IndirectCostConfig) => `${Number(item.energy_rate).toFixed(4)} €`
  },
  { 
    header: 'Amortización', 
    key: 'amortization_rate' as const,
    render: (item: IndirectCostConfig) => `${Number(item.amortization_rate).toFixed(4)} €`
  },
  { 
    header: 'Tasa Total', 
    key: 'id' as const,
    render: (item: IndirectCostConfig) => {
      const total = Number(item.labor_rate) + Number(item.energy_rate) + Number(item.amortization_rate);
      return <strong>{total.toFixed(4)} €/ud</strong>;
    }
  },
  { 
    header: 'Estado', 
    key: 'is_active' as const,
    render: (item: IndirectCostConfig) => (
      <span className={`${styles.badge} ${item.is_active ? styles.active : styles.inactive}`}>
        {item.is_active ? 'Activa' : 'Inactiva'}
      </span>
    )
  },
];

// 🔧 Objeto de Configuración para el Borrado Genérico
export const INDIRECT_COST_DELETE_CONFIG = {
  title: "¿Eliminar Configuración de Tasas?",
  codeLabel: "identificador",
  impactMessage: "Los cálculos de escandallos y márgenes comerciales que dependan de esta tasa deberán recalcularse."
};

// 👁️ Función Pura para transformar la entidad en los campos del Grid de Detalle
export const getIndirectCostDetailFields = (config: IndirectCostConfig): DetailFieldConfig[] => {
  const labor = Number(config.labor_rate);
  const energy = Number(config.energy_rate);
  const amortization = Number(config.amortization_rate);
  const total = labor + energy + amortization;

  return [
    { label: 'Nombre del Esquema', value: config.name },
    { 
      label: 'Estado de Aplicación', 
      value: config.is_active ? 'Configuración Vigente y Activa' : 'Histórico (Inactiva)' 
    },
    { label: 'Tasa Mano de Obra Directa', value: `${labor.toFixed(4)} € / botella` },
    { label: 'Tasa Energía y Suministros', value: `${energy.toFixed(4)} € / botella` },
    { label: 'Tasa Amortización de Maquinaria', value: `${amortization.toFixed(4)} € / botella` },
    { label: 'Costo Indirecto Acumulado', value: `${total.toFixed(4)} € / botella total` },
    { 
      label: 'Auditoría de Registro', 
      value: `Registrado el ${new Date(config.created_at).toLocaleString('es-ES')} (ID Único: ${config.id})`, 
      fullWidth: true, 
      isMeta: true 
    },
  ];
};