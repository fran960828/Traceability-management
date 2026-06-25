import React from 'react';
import { GenericTable } from '../../../shared/components/table';
import { FormButton } from '../../../shared/components/formInputs/FormButton';
import { FilterSelect } from '../../../shared/components/filters'; 
import { MOVEMENT_TYPE } from '../../../reception/models';
import { type StockMovement } from '../../models/stock.schema';
import { STOCK_MOVEMENT_COLUMNS_CONFIG } from '../../constants/stock.constants';
import styles from '../../../supplier/components/Supplier.container.module.css';

interface StockHistoryTableProps {
  movements: StockMovement[];
  isLoading: boolean;
  filters: any;
  updateFilters: (filters: any) => void;
  locationOptions: Array<{ id: string; name: string }>;
  onOpenDetail: (id: number) => void;
}

export const StockHistoryTable: React.FC<StockHistoryTableProps> = ({
  movements,
  isLoading,
  filters,
  updateFilters,
  locationOptions,
  onOpenDetail,
}) => {
  const headers = [...STOCK_MOVEMENT_COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  return (
    <>
      {/* Barra de Filtros específica del Histórico */}
      <div className={styles.filtersSection}>
        <FilterSelect
          label="Naturaleza de Movimiento"
          name="movement_type"
          value={filters.movement_type || ''}
          options={Object.entries({
            [MOVEMENT_TYPE.IN]: 'Entrada', 
            [MOVEMENT_TYPE.OUT]: 'Salida', 
            [MOVEMENT_TYPE.ADJUSTMENT]: 'Ajuste',
            [MOVEMENT_TYPE.TRANS_IN]: 'Traslado (Entrada)', 
            [MOVEMENT_TYPE.TRANS_OUT]: 'Traslado (Salida)'
          }).map(([k, v]) => ({ id: k, name: v }))}
          onChange={updateFilters}
        />
        <FilterSelect
          label="Filtrar por Zona"
          name="location"
          value={filters.location || ''}
          options={locationOptions}
          onChange={updateFilters}
        />
      </div>

      {/* Tabla del Histórico */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Extrayendo trazas de auditoría...</div>
        ) : (
          <GenericTable headers={headers}>
            {movements.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className={styles.emptyState}>
                  No hay trazas de stock en el histórico.
                </td>
              </tr>
            ) : (
              movements.map((movement: StockMovement) => (
                <tr key={movement.id} className={styles.tableRow}>
                  {STOCK_MOVEMENT_COLUMNS_CONFIG.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(movement) : (movement as any)[col.key]}
                    </td>
                  ))}
                  <td>
                    <FormButton variant="secondary" onClick={() => onOpenDetail(movement.id)}>
                      Ver Detalle
                    </FormButton>
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