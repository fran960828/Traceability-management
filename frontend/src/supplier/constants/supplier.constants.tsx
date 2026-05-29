import type { Path } from 'react-hook-form';
import { type SupplierFormValues } from '../models/supplier.schema';
import type { Supplier } from '../models';
import type { DetailFieldConfig } from '../../shared/components/detailView/DataGridDetail';
import styles from '../components/Supplier.container.module.css';

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

// 📊 Configuración de las Columnas de la Tabla
export const SUPPLIER_COLUMNS_CONFIG = [
  { header: 'Código', key: 'supplier_code' as const },
  { header: 'Nombre', key: 'name' as const },
  { header: 'NIF/CIF', key: 'tax_id' as const },
  { header: 'Categoría', key: 'category_name' as const }, 
  { header: 'Email Pedidos', key: 'email_pedidos' as const },
  { header: 'Teléfono', key: 'phone' as const },
  { header: 'Plazo (Días)', key: 'lead_time' as const },
  { 
    header: 'Estado', 
    key: 'is_active' as const,
    render: (item: Supplier) => (
      <span className={`${styles.badge} ${item.is_active ? styles.active : styles.inactive}`}>
        {item.is_active ? 'Activo' : 'Inactivo'}
      </span>
    )
  },
];

// 🔧 Objeto de Configuración para el Borrado Genérico
export const SUPPLIER_DELETE_CONFIG = {
  title: "¿Eliminar Proveedor?",
  codeLabel: "código",
  impactMessage: "Los pedidos de compra históricos asociados a este proveedor podrían verse afectados o quedar congelados."
};

// 👁️ Función Pura para transformar la entidad en los campos del Grid de Detalle
export const getSupplierDetailFields = (supplier: Supplier): DetailFieldConfig[] => {
  return [
    { label: 'NIF / CIF', value: supplier.tax_id },
    { 
      label: 'Plazo de Entrega Garantizado', 
      value: `${supplier.lead_time} ${supplier.lead_time === 1 ? 'día' : 'días'}` 
    },
    { label: 'Teléfono de Contacto', value: supplier.phone },
    { label: 'Email de Pedidos', value: supplier.email_pedidos },
    { label: 'Dirección de la Sede', value: supplier.address, fullWidth: true },
    { 
      label: 'Información de Registro', 
      value: `Dado de alta el ${new Date(supplier.created_at).toLocaleDateString('es-ES')} (ID Interno: ${supplier.id})`, 
      fullWidth: true, 
      isMeta: true 
    },
  ];
};