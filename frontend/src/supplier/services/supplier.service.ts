import { apiClient } from '../../shared/adapter';
import type{ 
  SupplierPaginationResponse, 
  SupplierFormValues, 
  Supplier,
  SupplierFilters,
  CategoryOption 
} from '../models';

export const SupplierService = {
  /**
   * Obtener lista paginada y filtrada (GET /suppliers/)
   */
  getAll: async (params?: SupplierFilters) => {
    const { data } = await apiClient.get<SupplierPaginationResponse>('supplier/suppliers/', { params });
    return data;
  },

  /**
   * Ver un proveedor en detalle (GET /suppliers/{id}/)
   */
  getById: async (id: number) => {
    const { data } = await apiClient.get<Supplier>(`supplier/suppliers/${id}/`);
    return data;
  },

  /**
   * Crear nuevo proveedor (POST /suppliers/)
   */
  create: async (supplier: SupplierFormValues) => {
    const { data } = await apiClient.post<Supplier>('supplier/suppliers/', supplier);
    return data;
  },

  /**
   * Modificación total - Sobreescribe todo el objeto (PUT /suppliers/{id}/)
   */
  update: async (id: number, supplier: SupplierFormValues) => {
    const { data } = await apiClient.put<Supplier>(`supplier/suppliers/${id}/`, supplier);
    return data;
  },

  /**
   * Modificación parcial - Solo campos enviados (PATCH /suppliers/{id}/)
   */
  partialUpdate: async (id: number, supplier: Partial<SupplierFormValues>) => {
    const { data } = await apiClient.patch<Supplier>(`supplier/suppliers/${id}/`, supplier);
    return data;    
  },

  /**
   * Eliminación (DELETE /suppliers/{id}/)
   */
  delete: async (id: number) => {
    await apiClient.delete(`supplier/suppliers/${id}/`);
    // Generalmente devuelve status 204 No Content
  }
};

export const CategoryService={
  getCategories: async (): Promise<CategoryOption[]> => {
    const { data } = await apiClient.get<CategoryOption[]>('supplier/categories/');
    return data;
  }
}

