import { z } from 'zod';

// Esquema para validación de formularios (POST)
export const SupplierFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  tax_id: z.string().min(9, 'CIF/NIF no válido'),
  category: z.number().int().positive('Selecciona una categoría'),
  email_pedidos: z.email('Email no válido'),
  phone: z.string().min(9, 'Teléfono demasiado corto'),
  address: z.string().min(5, 'La dirección es obligatoria'),
  lead_time: z.number().int().min(0, 'No puede ser negativo'),
  is_active: z.boolean().default(true),
});

export type SupplierFormValues = z.infer<typeof SupplierFormSchema>;

// Interfaz para la respuesta del GET (incluye campos del servidor)
export interface Supplier extends SupplierFormValues {
  id: number;
  supplier_code: string;
  category_name: string;
  created_at: string;
}

// Interfaz para la paginación de la API
export interface SupplierPaginationResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Supplier[];
}

export interface SupplierFilters {
  page?: number;
  name?: string;
  tax_id?: string;
  category?: number;
}