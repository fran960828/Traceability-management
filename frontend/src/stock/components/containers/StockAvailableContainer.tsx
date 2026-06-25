// src/modules/inventory/components/containers/StockAvailableTable.tsx
import React from 'react';
import { GenericTable } from '../../../shared/components/table';
import { FormButton } from '../../../shared/components/formInputs/FormButton';
import { FilterSelect } from '../../../shared/components/filters'; 
import { type AvailableBatch, type AvailableStockFilters } from '../../models/stock.schema';
import styles from '../../../supplier/components/Supplier.container.module.css';

interface StockAvailableTableProps {
  lots: AvailableBatch[]; // 🟢 CAMBIO 1: Nombre consistente con la entidad que recibe (Lotes, no movimientos)
  isLoading: boolean;
  filters: AvailableStockFilters;
  updateFilters: (filters:any) => void;
  locationOptions: Array<{ id: string; name: string }>;
  onOpenTransfer: (id: number) => void;
  onOpenAdjustment: (id: number) => void;
}

export const StockAvailableTable: React.FC<StockAvailableTableProps> = ({
  lots,
  isLoading,
  filters,
  updateFilters,
  locationOptions,
  onOpenTransfer,
  onOpenAdjustment,
}) => {
  const headers = ['Material / Insumo', 'Lote Físico', 'Ubicación Actual', 'Saldo Disponible', 'Acciones'];

  return (
    <>
      {/* Barra de Filtros de Existencias */}
      <div className={styles.filtersSection}>
        <FilterSelect
          label="Filtrar por Zona de Bodega"
          name="location"
          value={filters.location || ''}
          options={locationOptions}
          onChange={updateFilters}
        />
      </div>

      {/* Tabla de Lotes con Existencias */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Consultando inventario en tiempo real...</div>
        ) : (
          <GenericTable headers={headers}>
            {lots.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className={styles.emptyState}>
                  No se localizan lotes activos con existencias en esta zona.
                </td>
              </tr>
            ) : (
              // 🟢 CAMBIO 2: Eliminamos la agregación local pesada. Mapeamos directamente el tipo AvailableBatch
              lots.map((lot: AvailableBatch) => (
                <tr key={lot.id} className={styles.tableRow}>
                  <td><strong>{lot.product_name}</strong></td>
                  <td><code className={styles.codeHighlight}>{lot.batch_number}</code></td>
                  
                  {/* 🟢 CAMBIO 3: Nombre directo de la ubicación resuelta por Django */}
                  <td>{lot.location_name}</td>
                  
                  <td>
                    <strong style={{ color: '#16a34a' }}>
                      {/* 🟢 CAMBIO 4: Mapeo al campo correcto del Caché indexado de la Base de Datos */}
                      +{Number(lot.current_stock_cache).toFixed(3)} uds
                    </strong>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <FormButton variant="secondary" onClick={() => onOpenTransfer(lot.id)}>
                        Trasladar
                      </FormButton>
                      <FormButton variant="danger" onClick={() => onOpenAdjustment(lot.id)}>
                        Merma
                      </FormButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </GenericTable>
        )}
      </div>
    </>
  );
};