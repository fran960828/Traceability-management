// src/modules/inventory/services/reception.service.ts
import { apiClient } from '../../shared/adapter';
import type { BulkReceptionValues } from '../models/reception.schema';

export const ReceptionService = {
  /**
   * 📥 RECEPCIÓN MASIVA DE SUMINISTROS (ENTRADA ATÓMICA AL ALMACÉN)
   * Envía el lote, la línea de pedido de origen, la localización de destino y las cantidades.
   * Mapea directamente con: POST stock/movements/bulk-receive/
   * * @param payload Estructura que contiene el array de ítems validados por BulkReceptionSchema
   * @returns Mensaje de confirmación del backend {"detail": "Entrada registrada."}
   */
  bulkReceive: async (payload: BulkReceptionValues): Promise<{ detail: string }> => {
    const { data } = await apiClient.post<{ detail: string }>(
      'stock/movements/bulk-receive/', 
      payload
    );
    return data;
  }
};