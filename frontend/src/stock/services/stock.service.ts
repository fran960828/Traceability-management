import { apiClient } from '../../shared/adapter';
import type { 
  StockMovement, 
  StockMovementPaginationResponse, 
  StockMovementFilters,
  StockTransferOutput,
  StockAdjustmentOutput,
  AvailableStockFilters,              // 🟢 Importado desde el nuevo esquema
  AvailableStockPaginationResponse    // 🟢 Importado desde el nuevo esquema
} from '../models/stock.schema';

export const StockService = {
  /**
   * 📋 LISTAR MOVIMIENTOS DE STOCK (LIBRO DIARIO DE ALMACÉN)
   * Recupera el histórico inmutable paginado aplicando filtros analíticos avanzados cruzados.
   * Mapea con: GET /api/stock/movements/
   * @param filters Criterios de búsqueda (tipo de movimiento, rango de fechas, IDs, etc.)
   */
  getAll: async (filters?: StockMovementFilters): Promise<StockMovementPaginationResponse> => {
    const { data } = await apiClient.get<StockMovementPaginationResponse>(
      'stock/movements/', 
      { params: filters }
    );
    return data;
  },


  getAvailableStock: async (filters?: AvailableStockFilters): Promise<AvailableStockPaginationResponse> => {
    // Saneamiento de parámetros: Eliminamos las claves vacías ('') o nulas para no ensuciar la query de Django
    const cleanParams = filters
      ? Object.keys(filters).reduce((acc, key) => {
          const val = (filters as any)[key];
          if (val !== undefined && val !== null && val !== '') {
            acc[key] = val;
          }
          return acc;
        }, {} as Record<string, any>)
      : undefined;

    const { data } = await apiClient.get<AvailableStockPaginationResponse>(
      'stock/batch/',
      { params: cleanParams }
    );
    return data;
  },

  /**
   * 🔍 DETALLE DE UN MOVIMIENTO ESPECÍFICO
   * Recupera la traza de auditoría de un único movimiento de inventario por su ID.
   * Mapea con: GET /api/stock/movements/{id}/
   */
  getById: async (id: number): Promise<StockMovement> => {
    const { data } = await apiClient.get<StockMovement>(`stock/movements/${id}/`);
    return data;
  },

  /**
   * 🔄 TRANSFERENCIA DE STOCK ENTRE UBICACIONES
   * Mueve existencias físicas de una zona a otra de la bodega de forma atómica en el backend.
   * Mapea con el @action: POST /api/stock/movements/transfer/
   * @param payload Datos de la transferencia validados por StockTransferSchema (en positivo)
   * @returns Mensaje de confirmación del backend {"detail": "Transferencia completada."}
   */
  transfer: async (payload: StockTransferOutput): Promise<{ detail: string }> => {
    const { data } = await apiClient.post<{ detail: string }>(
      'stock/movements/transfer/', 
      payload
    );
    return data;
  },

  /**
   * ⚠️ AJUSTE DE INVENTARIO (SUMAS O RESTAS EN AUDITORÍA)
   * Registra un movimiento diario de tipo 'ADJ' para corregir descuadres físicos en la bodega.
   * Mapea con el @action: POST /api/stock/movements/adjustment/
   * @param payload Datos del ajuste manual validados por StockAdjustmentSchema
   */
  adjustment: async (payload: StockAdjustmentOutput): Promise<StockMovement> => {
    const { data } = await apiClient.post<StockMovement>(
      'stock/movements/adjustment/', 
      payload
    );
    return data;
  },
};