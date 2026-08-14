// src/modules/traceability/services/traceability.service.ts
import { apiClient } from '../../shared/adapter';
import type {
  LotTraceability,
  LotTraceabilityPaginationResponse,
  LotTraceabilityFilters,
} from '../models/traceability.schema';

export const TraceabilityService = {
  /**
   * 📋 LISTAR EXPEDIENTES DE TRAZABILIDAD
   * GET /api/traceability/
   */
  getAll: async (filters?: LotTraceabilityFilters): Promise<LotTraceabilityPaginationResponse> => {
    const cleanParams = filters
      ? Object.keys(filters).reduce((acc, key) => {
          const val = (filters as any)[key];
          if (val !== undefined && val !== null && val !== '') {
            acc[key] = val;
          }
          return acc;
        }, {} as Record<string, any>)
      : undefined;

    const { data } = await apiClient.get<LotTraceabilityPaginationResponse>('traceability/lot-traceability/', {
      params: cleanParams,
    });
    return data;
  },

  /**
   * 🔍 RECUPERAR EXPEDIENTE POR NÚMERO DE LOTE
   * GET /api/traceability/{lot_number}/
   */
  getByLotNumber: async (lotNumber: string): Promise<LotTraceability> => {
    const { data } = await apiClient.get<LotTraceability>(`traceability/lot-traceability/${lotNumber}/`);
    return data;
  },

  /**
   * 📄 DESCARGAR INFORME OFICIAL EN PDF CON SELLO HASH
   * GET /api/traceability/{lot_number}/download-pdf/
   */
  downloadPdf: async (lotNumber: string): Promise<void> => {
    const response = await apiClient.get(`traceability/lot-traceability/${lotNumber}/download-pdf/`, {
      responseType: 'blob', // Importante para manejar archivos binarios de PDF
    });

    // Disparar la descarga del archivo en el navegador del usuario
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Informe_Trazabilidad_${lotNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};