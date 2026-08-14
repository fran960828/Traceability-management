// src/modules/pricing/services/__tests__/indirectCost.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../shared/adapter';
import { IndirectCostService } from './indirectCost.service';
import type { IndirectCostConfigFormValues, IndirectCostFilters } from '../models/indirectCost.schema';

vi.mock('../../shared/adapter', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('IndirectCostService - Unit & Integration Tests', () => {
  const mockConfigResponse = {
    id: 1,
    name: 'Tasas Generales 2026',
    labor_rate: '0.1200',
    energy_rate: '0.0450',
    amortization_rate: '0.0800',
    is_active: true,
    created_at: '2026-08-12T10:00:00Z',
  };

  const mockPaginatedResponse = {
    count: 1,
    next: null,
    previous: null,
    results: [mockConfigResponse],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll() - Debe listar las configuraciones de costes indirectos', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockPaginatedResponse });

    const result = await IndirectCostService.getAll();

    expect(apiClient.get).toHaveBeenCalledWith('pricing/indirect-costs/', { params: undefined });
    expect(result).toEqual(mockPaginatedResponse);
  });

  it('getAll() - Debe purgar filtros vacíos o nulos', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockPaginatedResponse });

    const filters: IndirectCostFilters = { search: '2026', page: undefined };
    await IndirectCostService.getAll(filters);

    expect(apiClient.get).toHaveBeenCalledWith('pricing/indirect-costs/', {
      params: { search: '2026' },
    });
  });

  it('create() - Debe enviar el payload de nuevas tasas', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockConfigResponse });

    const newPayload: IndirectCostConfigFormValues = {
      name: 'Tasas Generales 2026',
      labor_rate: 0.12,
      energy_rate: 0.045,
      amortization_rate: 0.08,
      is_active: true,
    };

    const result = await IndirectCostService.create(newPayload);

    expect(apiClient.post).toHaveBeenCalledWith('pricing/indirect-costs/', newPayload);
    expect(result).toEqual(mockConfigResponse);
  });

  it('delete() - Debe invocar DELETE con el ID especificado', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({});

    await IndirectCostService.delete(1);

    expect(apiClient.delete).toHaveBeenCalledWith('pricing/indirect-costs/1/');
  });
});