import { apiClient } from '../../shared/adapter/apiClient'; // Tu cliente configurado con interceptores de JWT
import type { 
  PurchaseOrder, 
  PurchaseOrderPaginationResponse, 
  PurchaseOrderFormValues,
  PurchaseOrderFilters 
} from '../models/purchase.schema';

export const PurchaseService = {
  /**
   * 🔍 1. RECUPERAR EL CATÁLOGO PAGINADO DE ÓRDENES DE COMPRA
   * Envía los filtros analíticos (search, status, supplier) hacia los query params de Django.
   */
  getAll: async (filters: PurchaseOrderFilters = {}): Promise<PurchaseOrderPaginationResponse> => {
    // Limpiamos los filtros vacíos para no embozar la URL
    const params = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
    );
    
    const { data } = await apiClient.get<PurchaseOrderPaginationResponse>('/purchase/orders/', { params });
    return data;
  },

  /**
   * 📄 2. OBTENER EL DETALLE PROFUNDO DE UNA ORDEN ESPECÍFICA
   * Devuelve la cabecera y el array completo de ítems con sus nombres comerciales ya resueltos.
   */
  getById: async (id: number): Promise<PurchaseOrder> => {
    const { data } = await apiClient.get<PurchaseOrder>(`/purchase/orders/${id}/`);
    return data;
  },

  /**
   * ➕ 3. REGISTRAR NUEVA ÓRDEN DE COMPRA CON LÍNEAS ANIDADAS (ATÓMICO)
   * Envía el payload completo estructurado por Zod. Django ejecutará el transaction.atomic()
   * y si una sola línea falla, deshará la creación para evitar datos huérfanos.
   */
  create: async (values: PurchaseOrderFormValues): Promise<PurchaseOrder> => {
    // Sanitizamos el payload asegurando que los tipos numéricos van limpios hacia el serializer
    const apiPayload = {
      ...values,
      supplier: Number(values.supplier),
      items: values.items.map(item => ({
        ...item,
        quantity_ordered: Number(item.quantity_ordered),
        quantity_received: Number(item.quantity_received || 0),
        unit_price: String(item.unit_price), // Lo mandamos como string numérico para el DecimalField
        packaging: item.packaging ? Number(item.packaging) : null,
        label: item.label ? Number(item.label) : null,
        enological: item.enological ? Number(item.enological) : null,
      }))
    };

    const { data } = await apiClient.post<PurchaseOrder>('/purchase/orders/', apiPayload);
    return data;
  },

  /**
   * 📝 4. ACTUALIZACIÓN INTEGRAL DE CABECERA Y LÍNEAS
   * Aplica la estrategia ERP estándar del backend: borra los ítems antiguos y graba los nuevos.
   * Bloqueado automáticamente por Django si el estado original es CLOSED o CANCELLED.
   */
  update: async (id: number, values: PurchaseOrderFormValues): Promise<PurchaseOrder> => {
    const apiPayload = {
      ...values,
      supplier: Number(values.supplier),
      items: values.items.map(item => ({
        ...item,
        quantity_ordered: Number(item.quantity_ordered),
        quantity_received: Number(item.quantity_received || 0),
        unit_price: String(item.unit_price),
        packaging: item.packaging ? Number(item.packaging) : null,
        label: item.label ? Number(item.label) : null,
        enological: item.enological ? Number(item.enological) : null,
      }))
    };

    const { data } = await apiClient.put<PurchaseOrder>(`/purchase/orders/${id}/`, apiPayload);
    return data;
  },

  /**
   * ❌ 5. ELIMINACIÓN CRÍTICA DE ÓRDENES
   * Solo se ejecutará si la orden se encuentra en estado DRAFT o OPEN.
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/purchase/orders/${id}/`);
  },

  /**
   * 🔄 6. PRE-LLENADO INTELIGENTE DE CLONACIÓN DE PEDIDOS (CloneMixin)
   * Recupera el esqueleto de un pedido anterior (proveedor y artículos habituales),
   * reseteando las cantidades recibidas a 0 y el estado a DRAFT para agilizar las compras recurrentes.
   */
  clone: async (id: number): Promise<PurchaseOrderFormValues> => {
    const { data } = await apiClient.get<PurchaseOrderFormValues>(`/purchase/orders/${id}/clone-prefill/`);
    return data;
  }
};