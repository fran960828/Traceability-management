import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/adapter/apiClient';
import { PurchaseService } from './purchase.service';
import { PURCHASE_ORDER_STATUS } from '../models/purchase.schema';

// Convertimos el cliente Axios en un objeto espiable por Vitest
vi.mock('../../shared/adapter/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('PurchaseService - Unit & Integration Tests', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 🟢 SECCIÓN 1: HAPPY PATHS (CASOS DE ÉXITO)
  // =========================================================================
  
  it('1. getAll - Debe limpiar filtros vacíos y retornar las órdenes paginadas con sus ítems', async () => {
    const mockApiResponse = {
      count: 1,
      results: [
        {
          id: 1,
          order_number: 'PO-2026-0001',
          supplier: 5,
          status: PURCHASE_ORDER_STATUS.DRAFT,
          items: [{ id: 10, material_name: 'Corcho Natural', quantity_ordered: 5000 }]
        }
      ]
    };
    
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockApiResponse });

    const filters = { search: 'Ontalba', status: PURCHASE_ORDER_STATUS.DRAFT, supplier: '' };
    const result = await PurchaseService.getAll(filters);

    // Verificamos que eliminó 'supplier' del objeto enviado porque venía como string vacío
    expect(apiClient.get).toHaveBeenCalledWith('/purchase/orders/', {
      params: { search: 'Ontalba', status: 'DRAFT' }
    });
    expect(result.results[0].order_number).toBe('PO-2026-0001');
    expect(result.results[0].items).toHaveLength(1);
  });

  it('2. create - Debe sanitizar los datos tipados de la UI a números estrictos para Django', async () => {
    const mockCreatedOrder = { id: 9, order_number: 'PO-2026-0009', supplier: 3, status: 'DRAFT' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockCreatedOrder });

    // Datos tal cual salen de los selectores HTML del formulario (Strings)
    const formValues = {
      supplier: '3',
      status: PURCHASE_ORDER_STATUS.DRAFT,
      date_delivery_expected: '2026-06-15',
      notes: 'Pedido urgente',
      items: [
        {
          packaging: '12', // ID de botella como string
          label: null,
          enological: '',  // Dropdown vacío
          quantity_ordered: 1000,
          quantity_received: 0,
          unit_price: '0.4500'
        }
      ]
    };

    const result = await PurchaseService.create(formValues as any);

    // Verificamos el casteo de tipos para el Serializer de Django
    expect(apiClient.post).toHaveBeenCalledWith('/purchase/orders/', {
      supplier: 3, // Transformado a número
      status: 'DRAFT',
      date_delivery_expected: '2026-06-15',
      notes: 'Pedido urgente',
      items: [
        {
          packaging: 12, // Transformado a número
          label: null,
          enological: null, // String vacía convertida en null
          quantity_ordered: 1000,
          quantity_received: 0,
          unit_price: '0.4500' // Mantenido como string decimal (DecimalField)
        }
      ]
    });
    expect(result.id).toBe(9);
  });

  it('3. clone - Debe invocar el endpoint de pre-llenado del CloneMixin de la cabecera', async () => {
    const mockCloneData = { supplier: 3, status: 'DRAFT', items: [] };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockCloneData });

    const result = await PurchaseService.clone(1);

    expect(apiClient.get).toHaveBeenCalledWith('/purchase/orders/1/clone-prefill/');
    expect(result.status).toBe(PURCHASE_ORDER_STATUS.DRAFT);
  });

  // =========================================================================
  // 🔴 SECCIÓN 2: EDGE CASES & GESTIÓN DE ERRORES (ROBUSTEZ)
  // =========================================================================

  it('4. getAll - Debe comportarse de forma estable si se ejecuta sin pasar filtros', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { count: 0, results: [] } });

    await PurchaseService.getAll();

    expect(apiClient.get).toHaveBeenCalledWith('/purchase/orders/', { params: {} });
  });

  it('5. update - Debe propagar limpiamente los errores de validación de Django (Ej: Orden Cerrada)', async () => {
    const djangoErrorResponse = {
      response: {
        status: 400,
        data: { data: ['Acceso denegado: La orden está en estado CLOSED y no permite cambios.'] }
      }
    };
    
    // Forzamos al cliente Axios a rechazar la promesa con el error del backend
    vi.mocked(apiClient.put).mockRejectedValueOnce(djangoErrorResponse);

    const formValues = { supplier: '3', status: PURCHASE_ORDER_STATUS.CLOSED, items: [] };

    await expect(PurchaseService.update(1, formValues as any)).rejects.toThrow();
  });

  it('6. delete - Debe disparar la petición DELETE con el ID correspondiente', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ status: 204 });

    await PurchaseService.delete(5);

    expect(apiClient.delete).toHaveBeenCalledWith('/purchase/orders/5/');
  });
});