import type { Path } from 'react-hook-form';
import { type LabelFormValues } from '../models/label.schema';

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