// src/modules/production_record/components/containers/ProductionRecordContainer.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query'; 
import { Rocket } from 'lucide-react';

import { useDataMutation, useDataTable } from '../../shared/hooks';
import { FilterInput, FilterSelect } from '../../shared/components/filters'; 
import { GenericTable, GenericRow } from '../../shared/components/table';
import { Pagination } from '../../shared/components/pagination/Pagination';
import { ProductionService } from '../services/productionRecord.service';

import { 
  type ProductionOrder, 
  type ProductionOrderPaginationResponse, 
  type ProductionOrderOutput, 
} from '../models/productionRecord.schema'; 

import { ProductionOrderForm } from './forms/ProductionRecordForm';
import { GenericDeleteForm } from '../../shared/components/forms/forms.delete';
import { GenericDetailView } from '../../shared/components/forms/forms.detail';
import { FormButton } from '../../shared/components/formInputs/FormButton';
import { useModal } from '../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../shared/components/modal/Modal'; 

import { 
  PRODUCTION_ORDER_COLUMNS_CONFIG, 
  getProductionOrderDetailFields 
} from '../constants/productionRecord.constants';
import styles from '../../supplier/components/Supplier.container.module.css';
import { ProductionConfirmForm } from './forms/ProductionConfirmForm';

export const ProductionRecordContainer: React.FC = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // 1. Sincronización analítica de filtros y Query params con Django
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<ProductionOrderPaginationResponse>({
    key: 'production-orders-history',
    fetchFn: ProductionService.getAll,
  });

  const productionList = data?.results || [];
  const totalCount = data?.count || 0;
  const selectedOrder = productionList.find(p => p.id === Number(activeId));
  const tableHeaders = [...PRODUCTION_ORDER_COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  // Selectores de filtrado estáticos correspondientes a los TextChoices de Django
  const statusOptions = [
    { id: 'DRAFT', name: 'Borrador' },
    { id: 'CONFIRMED', name: 'Confirmado (Stock descontado)' },
    { id: 'CANCELLED', name: 'Cancelado' },
  ];

  // Query asíncrona para recuperar los datos proporcionales limpios del CloneMixin de DRF
  const { data: clonePrefillData, isLoading: isLoadingClonePrefill } = useQuery({
    queryKey: ['production-order-clone-prefill', activeId],
    queryFn: () => ProductionService.getClonePrefill(Number(activeId)),
    enabled: activeAction === 'clone' && !!activeId,
    staleTime: 0, 
  });

  // =======================================================
  // 💾 2. MUTACIONES ASÍNCRONAS TRANSACCIONALES (ESTADO)
  // =======================================================
  const createMutation = useDataMutation({
    mutationFn: ProductionService.create,
    invalidateKeys: ['production-orders-history'],
    onSuccess: () => closeModal(),
  });

  const updateMutation = useDataMutation({
    mutationFn: ({ id, values }: { id: number; values: ProductionOrderOutput }) => ProductionService.update(id, values),
    invalidateKeys: ['production-orders-history'],
    onSuccess: () => closeModal(),
  });

  const deleteMutation = useDataMutation({
    mutationFn: ProductionService.delete,
    invalidateKeys: ['production-orders-history'],
    onSuccess: () => closeModal(),
  });

  const confirmMutation = useDataMutation({
    mutationFn: ProductionService.confirm,
    invalidateKeys: ['production-orders-history'],
    onSuccess: () => closeModal(),
  });

  // Despachador hacia el servicio unificado (Create / Edit)
  const handleFormSubmit = (formValues: ProductionOrderOutput) => {
    if (activeAction === 'edit' && selectedOrder) {
      updateMutation.mutate({ id: selectedOrder.id, values: formValues });
    } else {
      createMutation.mutate(formValues);
    }
  };

  // Prepara los datos iniciales para el formulario dinámico
  const getFormInitialData = (): any => {
    if (activeAction === 'edit' && selectedOrder) {
      return selectedOrder;
    }
    if (activeAction === 'clone' && clonePrefillData) {
      return clonePrefillData;
    }
    return undefined;
  };

  if (isError) {
    return <div className={styles.errorContainer}>Error crítico al recuperar el histórico de embotellados.</div>;
  }

  const getModalTitle = () => {
    if (activeAction === 'create') return 'Registrar Parte de Embotellado';
    if (activeAction === 'edit') return 'Modificar Parte en Borrador';
    if (activeAction === 'clone') return 'Clonar Parámetros de Embotellado';
    if (activeAction === 'delete') return 'Advertencia: Eliminar Borrador de Producción';
    if (activeAction === 'detail') return 'Ficha Técnica de Producción y Mermas';
    if (activeAction === 'confirm') return 'Confirmación de Cierre y Descuento FIFO';
    return undefined;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div className={styles.topToolbar}>
        <h1 className={styles.pageTitle}>Registro de Embotellados</h1>
        <FormButton variant="primary" onClick={() => openModal('create')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 18, height: 18, marginRight: 6 }}>
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Abrir Parte (Borrador)
        </FormButton>
      </div>

      {/* SECCIÓN DE FILTROS */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Buscar Parte de Producción"
          name="search"
          value={filters.search}
          onChange={updateFilters}
          placeholder="Lote, vino o notas..."
        />
        <FilterSelect
          label="Estado del Parte"
          name="status"
          value={filters.status}
          options={statusOptions}
          onChange={updateFilters}
        />
      </div>

      {/* TABLA PRINCIPAL DE PARTES DE EMBOTELLADO */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Procesando histórico de producción y mermas...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {productionList.length === 0 ? (
              <tr><td colSpan={tableHeaders.length} className={styles.emptyState}>No se localizan partes de embotellado que coincidan con el criterio seleccionado.</td></tr>
            ) : (
              productionList.map((order) => (
                <GenericRow<ProductionOrder>
                  key={order.id}
                  item={order}
                  columns={PRODUCTION_ORDER_COLUMNS_CONFIG}
                  actions={{
                    view: () => openModal('detail', order.id),
                    edit: order.status !== 'DRAFT' ? undefined : () => openModal('edit', order.id), 
                    delete: order.status !== 'DRAFT' ? undefined : () => openModal('delete', order.id),
                    clone: () => openModal('clone', order.id),
                    
                    // 🟢 ACCIÓN PERSONALIZADA: Botón de confirmación (Cohete) exclusivo para borradores
                    custom: order.status === 'DRAFT' ? [
                      {
                        label: 'Confirmar Cierre FIFO',
                        icon: Rocket,
                        onClick: (id) => openModal('confirm', id),
                      }
                    ] : undefined
                  }}
                />
              ))
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

      {/* PORTAL TRANSACCIONAL DE VENTANAS MODALES */}
      {activeAction && (
        <Modal onClose={closeModal} title={getModalTitle()} showCloseButton={activeAction !== 'delete' && activeAction !== 'confirm'}>
          
          {/* Ficha Expandida de Detalle */}
          {activeAction === 'detail' && selectedOrder && (
            <GenericDetailView<ProductionOrder>
              data={selectedOrder}
              badgeLabel="Estado:"
              badgeValue={selectedOrder.status_display}
              titleLabel="Lote Final:"
              titleValue={selectedOrder.lot_number || 'BORRADOR PENDIENTE'}
              codeLabel="ID Interno de Producción"
              codeValue={String(selectedOrder.id)}
              isActive={selectedOrder.status === 'CONFIRMED'}
              fields={getProductionOrderDetailFields(selectedOrder)}
              onBack={closeModal}
              onEditClick={selectedOrder.status === 'DRAFT' ? (o) => openModal('edit', o.id) : undefined}
              onDeleteClick={selectedOrder.status === 'DRAFT' ? (o) => openModal('delete', o.id) : undefined}
            />
          )}

          {/* Formulario Unificado Dinámico (Crear / Editar / Clonar) */}
          {(activeAction === 'create' || activeAction === 'edit' || activeAction === 'clone') && (
            isLoadingClonePrefill ? (
              <div className={styles.loadingPlaceholder}>Extrayendo plantilla de embotellado proporcional...</div>
            ) : (
              <ProductionOrderForm 
                productInitialData={getFormInitialData()}
                onSubmit={handleFormSubmit}
                onCancel={closeModal}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
                activeAction={activeAction as 'create' | 'edit' | 'clone'}
              />
            )
          )}

          {/* Formulario de Borrado Físico (Solo si es Borrador) */}
          {activeAction === 'delete' && selectedOrder && (
            <GenericDeleteForm<number>
              id={selectedOrder.id}
              name={selectedOrder.lot_number || `Borrador ID: ${selectedOrder.id}`}
              subtitle={selectedOrder.wine_name}
              codeValue={String(selectedOrder.id)}
              title="¿Deseas eliminar permanentemente este borrador?"
              codeLabel="Esta acción purgará el registro del sistema de forma definitiva. No se alterarán existencias de inventario al encontrarse en estado borrador."
              impactMessage="Esta acción es irreversible."
              onCancel={closeModal}
              onConfirm={(id) => deleteMutation.mutate(id)}
              isSubmitting={deleteMutation.isPending}
            />
          )}

          {/* 🟢 FORMULARIO DE CONFIRMACIÓN FIFO DEDICADO */}
          {activeAction === 'confirm' && selectedOrder && (
            <ProductionConfirmForm
              order={selectedOrder}
              onConfirm={() => confirmMutation.mutate(selectedOrder.id)}
              onCancel={closeModal} // Simplemente cierra la modal sin cancelar el registro
              isSubmitting={confirmMutation.isPending}
              errorMessage={
                confirmMutation.isError 
                  ? ((confirmMutation.error as any)?.response?.data?.detail || 
                    (confirmMutation.error as any)?.response?.data?.message || 
                    'Stock insuficiente en inventario para ejecutar el consumo FIFO de esta receta.')
                  : null
              }
            />
          )}
        </Modal>
      )}
    </div>
  );
};