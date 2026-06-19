import React from 'react';
import { useDataMutation, useDataTable } from '../../shared/hooks';
import { FilterInput, FilterSelect } from '../../shared/components/filters'; 
import { GenericTable } from '../../shared/components/table';
import { Pagination } from '../../shared/components/pagination/Pagination';
import { StockService } from '../services/stock.service';
import { LocationService } from '../../locations/services/location.service';
import { useModal } from '../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../shared/components/modal/Modal'; 
import { GenericDetailView } from '../../shared/components/forms/forms.detail';
import { FormButton } from '../../shared/components/formInputs/FormButton';

// Esquemas y Elementos de Formulario compartidos
import { type StockMovement } from '../models/stock.schema';
import { MOVEMENT_TYPE, MOVEMENT_TYPE_LABELS } from '../../reception/models';

import { StockTransferForm } from './forms/';
import { StockAdjustmentForm } from './forms/';
import { STOCK_MOVEMENT_COLUMNS_CONFIG, getStockMovementDetailFields } from '../constants/stock.constants';

import styles from '../../supplier/components/Supplier.container.module.css';
import { queryClient } from '../../shared/client';

export const StockMovementContainer: React.FC = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // 1. Carga del Libro Diario de Almacén asistido por Query Params analíticos de Django
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<any>({
    key: 'stock-movements-history',
    fetchFn: StockService.getAll,
  });

  // Catálogo complementario de localizaciones para el filtro superior del Dashboard
  const { data: locationsFilterData } = useDataTable({
    key: 'locations-dashboard-filter',
    fetchFn: LocationService.getAll,
  });

  const movementsList = data?.results || [];
  const totalCount = data?.count || 0;
  
  // 🎯 CAPTURA CONTEXTUAL: Localizamos el objeto exacto de la fila seleccionada usando el activeId del modal
  const selectedMovement = movementsList.find((m: StockMovement) => m.id === Number(activeId));

  const tableHeaders = [...STOCK_MOVEMENT_COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  // Selectores dinámicos para la barra de herramientas de filtros
  const movementTypeOptions = Object.entries(MOVEMENT_TYPE_LABELS).map(([key, value]) => ({
    id: key,
    name: value,
  }));

  const locationFilterOptions = (locationsFilterData?.results || [])
    .filter(loc => loc.is_active)
    .map(loc => ({
      id: String(loc.id),
      name: loc.name,
    }));

  // 2. Operación Mutación A: Transferencia entre Ubicaciones
  const transferMutation = useDataMutation({
    mutationFn: StockService.transfer,
    invalidateKeys: ['stock-movements-history'],
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['locations-transfer-select'] }),
        queryClient.invalidateQueries({ queryKey: ['movements-transfer-batch'] }),
        queryClient.invalidateQueries({ queryKey: ['labels-inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['enological-inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['packaging-inventory'] })
      ]);
      closeModal();
    },
  });

  // 3. Operación Mutación B: Ajustes manuales y mermas por rotura/caducidad
  const adjustmentMutation = useDataMutation({
    mutationFn: StockService.adjustment,
    invalidateKeys: ['stock-movements-history'],
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['movements-adjustment-batch'] }),
        queryClient.invalidateQueries({ queryKey: ['labels-inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['enological-inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['packaging-inventory'] })
      ]);
      closeModal();
    },
  });

  if (isError) {
    return <div className={styles.errorContainer}>Error crítico de auditoría al recuperar el libro diario de movimientos.</div>;
  }

  const getModalTitle = () => {
    if (activeAction === 'transfer') return `Registrar Traslado - Lote ${selectedMovement?.batch_number}`;
    if (activeAction === 'adjustment') return `Declarar Ajuste / Merma - Lote ${selectedMovement?.batch_number}`;
    if (activeAction === 'detail') return 'Ficha Técnica de Auditoría de Movimiento';
    return undefined;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* 🟢 TOP TOOLBAR REFACTORIZADO: Se remueven los botones globales ineficientes */}
      <div className={styles.topToolbar}>
        <h1 className={styles.pageTitle}>Libro Diario de Existencias</h1>
      </div>

      {/* SECCIÓN DE FILTROS AVANZADOS CRUZADOS */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Buscar en Histórico"
          name="search"
          value={filters.search || ''}
          onChange={updateFilters}
          placeholder="Lote o material..."
        />
        <FilterSelect
          label="Naturaleza de Movimiento"
          name="movement_type"
          value={filters.movement_type || ''}
          options={movementTypeOptions}
          onChange={updateFilters}
        />
        <FilterSelect
          label="Zonas de Bodega"
          name="location"
          value={filters.location || ''}
          options={locationFilterOptions}
          onChange={updateFilters}
        />
      </div>

      {/* GRID GENERAL DEL REGISTRO INMUTABLE */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Extrayendo trazas de auditoría del servidor...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {movementsList.length === 0 ? (
              <tr><td colSpan={tableHeaders.length} className={styles.emptyState}>No hay trazas de stock que coincidan con la navegación analítica.</td></tr>
            ) : (
              movementsList.map((movement: StockMovement) => {
                // 🔒 CONTROL CONTEXTUAL: Solo las Entradas/Compras (IN) habilitan operaciones posteriores de stock
                const isEntry = movement.movement_type === MOVEMENT_TYPE.IN;

                return (
                  <tr key={movement.id} className={styles.tableRow}>
                    {STOCK_MOVEMENT_COLUMNS_CONFIG.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(movement) : (movement as any)[col.key]}
                      </td>
                    ))}
                    
                    {/* 🟢 NUEVA BOTONERA INLINE CON DISTRIBUCIÓN HORIZONTAL */}
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <FormButton variant="secondary" onClick={() => openModal('detail', movement.id)}>
                          Ver
                        </FormButton>
                        
                        {isEntry && (
                          <>
                            <FormButton variant="secondary" onClick={() => openModal('transfer', movement.id)}>
                              Trasladar
                            </FormButton>
                            <FormButton variant="danger" onClick={() => openModal('adjustment', movement.id)}>
                              Merma
                            </FormButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </GenericTable>
        )}
      </div>

      {/* CONTROL DE PAGINACIÓN */}
      <footer className={styles.footerSection}>
        <Pagination
          count={totalCount}
          currentPage={Number(filters.page) || 1}
          onPageChange={(newPage) => updateFilters({ page: newPage })}
          pageSize={10} 
        />
      </footer>

      {/* PORTAL INTEGRADO DE PORTALES MODALES */}
      {activeAction && selectedMovement && (
        <Modal onClose={closeModal} title={getModalTitle()} showCloseButton>
          
          {/* Modal 1: Vista Detallada de Auditoría */}
          {activeAction === 'detail' && (
            <GenericDetailView<StockMovement>
              data={selectedMovement}
              badgeLabel="Tipo:"
              badgeValue={MOVEMENT_TYPE_LABELS[selectedMovement.movement_type as MOVEMENT_TYPE]}
              titleLabel="Operación Nº:"
              titleValue={String(selectedMovement.id)}
              codeLabel="Identificador Almacén"
              codeValue={selectedMovement.batch_number}
              isActive={Number(selectedMovement.quantity) !== 0}
              fields={getStockMovementDetailFields(selectedMovement)}
              onBack={closeModal}
            />
          )}

          {/* Modal 2: Formulario de Transferencias Directas */}
          {activeAction === 'transfer' && (
            <StockTransferForm 
              initialMovementData={selectedMovement} // 🟢 Pasamos los datos del lote inyectados de la fila
              onSubmit={(values) => transferMutation.mutate(values)}
              onCancel={closeModal}
              isSubmitting={transferMutation.isPending}
            />
          )}

          {/* Modal 3: Formulario de Mermas y Ajustes Directos */}
          {activeAction === 'adjustment' && (
            <StockAdjustmentForm 
              initialMovementData={selectedMovement} // 🟢 Pasamos los datos del lote inyectados de la fila
              onSubmit={(values) => adjustmentMutation.mutate(values)}
              onCancel={closeModal}
              isSubmitting={adjustmentMutation.isPending}
            />
          )}

        </Modal>
      )}

    </div>
  );
};