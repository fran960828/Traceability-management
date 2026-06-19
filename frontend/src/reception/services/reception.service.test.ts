// src/modules/inventory/services/__tests__/reception.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReceptionService } from './reception.service';
import { apiClient } from '../../shared/adapter';
import type { BulkReceptionOutput } from '../models/reception.schema';

// Mockeamos de forma aislada la instancia central de Axios
vi.mock('../../shared/adapter', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('ReceptionService - Unit & Robustness Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Payload base válido que simula la entrada de un palet de botellas por el muelle
  const mockValidPayload: BulkReceptionOutput = {
    items: [
      {
        order_item: 10,
        location: 2, // ALMACEN_GENERAL
        batch_number: 'LOTE-BOT-2026-A',
        quantity: 5000,
        pending_quantity:5000,
        expiry_date: null,
        notes: 'Recepción conforme de frascos',
      }
    ]
  };

  // ==========================================
  // 🟢 SECCIÓN 1: HAPPY PATH (FLUJO DE ÉXITO)
  // ==========================================
  describe('Happy Path', () => {
    it('1. bulkReceive - Debería despachar un POST íntegro al endpoint de DRF y retornar confirmación', async () => {
      const mockBackendResponse = { data: { detail: 'Entrada registrada.' } };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockBackendResponse);

      const result = await ReceptionService.bulkReceive(mockValidPayload);

      // Verificamos que la URL coincide exactamente con la acción @action del ViewSet
      expect(apiClient.post).toHaveBeenCalledWith(
        'stock/movements/bulk-receive/',
        mockValidPayload
      );
      expect(result.detail).toBe('Entrada registrada.');
    });
  });

  // ==========================================
  // 🔴 SECCIÓN 2: EDGE CASES & ROBUSTEZ ERRÓNEA
  // ==========================================
  describe('Edge Cases & API Errors', () => {
    it('2. Debería propagar correctamente un error 400 si Django detecta cantidades que exceden lo comprado', async () => {
      // Simulamos la respuesta de validación cruzada del GoodsReceptionItemSerializer
      const mockOverQuantityError = {
        response: {
          status: 400,
          data: {
            items: [
              { quantity: ['Cantidad excedida. Cantidad pendiente: 1000. Intentado: 5000'] }
            ]
          }
        }
      };
      vi.mocked(apiClient.post).mockRejectedValueOnce(mockOverQuantityError);

      try {
        await ReceptionService.bulkReceive(mockValidPayload);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.items[0].quantity[0]).toContain('Cantidad excedida');
      }

      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });

    it('3. Debería propagar un error de validación masiva si el backend rechaza lotes duplicados', async () => {
      // Simulamos el error lanzado por la función validate_items del BulkReceptionSerializer
      const mockDuplicateBatchError = {
        response: {
          status: 400,
          data: {
            items: ['Hay números de lote duplicados en esta recepción.']
          }
        }
      };
      vi.mocked(apiClient.post).mockRejectedValueOnce(mockDuplicateBatchError);

      try {
        await ReceptionService.bulkReceive(mockValidPayload);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.items[0]).toBe('Hay números de lote duplicados en esta recepción.');
      }
    });

    it('4. Debería propagar un error de transacción si la base de datos aborta por fallo atómico', async () => {
      // Simulamos que el bloque try/except de tu viewset captura un fallo de DB inesperado
      const mockDbTransactionError = {
        response: {
          status: 400,
          data: { detail: 'Database error: Mulltiple updates failed integrity constraints.' }
        }
      };
      vi.mocked(apiClient.post).mockRejectedValueOnce(mockDbTransactionError);

      try {
        await ReceptionService.bulkReceive(mockValidPayload);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.detail).toContain('Database error');
      }
    });
  });
});