import type { Path } from 'react-hook-form';
import { type SupplierFormValues } from '../../models/supplier.schema';

export interface InputConfig {
  name: Path<SupplierFormValues>; 
  label: string;
  type?: string;
  placeholder?: string;
  halfWidth?: boolean; 
}

export const DEFAULT_SUPPLIER_VALUES: SupplierFormValues = {
  name: '',
  tax_id: '',
  category: undefined as any, // Forzamos el undefined inicial para el select
  email_pedidos: '',
  phone: '',
  address: '',
  lead_time: 0,
  is_active: true,
};

export const INPUTS_CONFIG: InputConfig[] = [
  { name: 'name', label: 'Nombre / Razón Social *', placeholder: 'Ej: Vidrios del Duero S.L.', halfWidth: true },
  { name: 'tax_id', label: 'NIF / CIF *', placeholder: 'Ej: B12345678', halfWidth: true },
  { name: 'email_pedidos', label: 'Email de Pedidos *', type: 'email', placeholder: 'pedidos@proveedor.com', halfWidth: true },
  { name: 'phone', label: 'Teléfono *', type: 'tel', placeholder: 'Ej: 34 600 000 000', halfWidth: true },
  { name: 'lead_time', label: 'Plazo de entrega (Días) *', type: 'number', halfWidth: true },
  { name: 'address', label: 'Dirección de la Sede *', placeholder: 'Calle, Número, Planta, C.P. y Localidad', halfWidth: false }, 
];
