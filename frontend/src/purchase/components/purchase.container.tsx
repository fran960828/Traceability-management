// src/modules/purchase/components/containers/PurchaseContainer.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query'; 
import { useDataMutation, useDataTable } from '../../shared/hooks';
import { FilterInput, FilterSelect } from '../../shared/components/filters'; 
import { GenericTable, GenericRow } from '../../shared/components/table';
import { Pagination } from '../../shared/components/pagination/Pagination';
import { PurchaseService } from '../service/purchase.service';
import { SupplierService } from '../../supplier/services/supplier.service';
import { 
  type PurchaseOrder, 
  type PurchaseOrderPaginationResponse, 
  type PurchaseOrderFormValues, 
  PURCHASE_ORDER_STATUS,
  PURCHASE_ORDER_STATUS_LABELS
} from '../models/purchase.schema'; 

import { PurchaseForm } from './forms/purchase.create';
import { GenericDeleteForm } from '../../shared/components/forms/forms.delete';
import { GenericDetailView } from '../../shared/components/forms/forms.detail';
import { FormButton } from '../../shared/components/formInputs/FormButton';
import { useModal } from '../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../shared/components/modal/Modal'; 

import { 
  PURCHASE_ORDER_COLUMNS_CONFIG, 
  PURCHASE_DELETE_CONFIG, 
  getPurchaseOrderDetailFields 
} from '../constants/purchase.constants';
import styles from '../../supplier/components/Supplier.container.module.css';

export const PurchaseContainer: React.FC = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // 1. Sincronización analítica de filtros y Query params con Django
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<PurchaseOrderPaginationResponse>({
    key: 'purchase-orders-inventory',
    fetchFn: PurchaseService.getAll,
  });

  // Catálogo complementario de proveedores homologados para alimentar el selector de filtrado
  const { data: suppliersData } = useDataTable({
    key: 'suppliers-filter-list',
    fetchFn: SupplierService.getAll,
  });

  const ordersList = data?.results || [];
  const totalCount = data?.count || 0;
  const selectedOrder = ordersList.find(o => o.id === Number(activeId));
  const tableHeaders = [...PURCHASE_ORDER_COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  // Selectores dinámicos para los filtros de la cabecera
  const statusOptions = Object.entries(PURCHASE_ORDER_STATUS_LABELS).map(([key, value]) => ({
    id: key,
    name: value,
  }));
  const supplierFilterOptions = (suppliersData?.results || []).map(s => ({
    id: String(s.id),
    name: s.name,
  }));

  // Query asíncrona para recuperar los datos pre-limpiados del CloneMixin
  const { data: clonePrefillData, isLoading: isLoadingClonePrefill } = useQuery({
    queryKey: ['purchase-order-clone-prefill', activeId],
    queryFn: () => PurchaseService.clone(Number(activeId)),
    enabled: activeAction === 'clone' && !!activeId,
    staleTime: 0, 
  });

  // 2. Operaciones de Mutación Asíncronas (TanStack Query)
  const createMutation = useDataMutation({
    mutationFn: PurchaseService.create,
    invalidateKeys: ['purchase-orders-inventory'],
    onSuccess: () => closeModal(),
  });

  const updateMutation = useDataMutation({
    mutationFn: ({ id, values }: { id: number; values: PurchaseOrderFormValues }) => PurchaseService.update(id, values),
    invalidateKeys: ['purchase-orders-inventory'],
    onSuccess: () => closeModal(),
  });

  const deleteMutation = useDataMutation({
    mutationFn: PurchaseService.delete,
    invalidateKeys: ['purchase-orders-inventory'],
    onSuccess: () => closeModal(),
  });

  // Despacho controlado hacia el Service (Las conversiones numéricas ya ocurren dentro de él)
  const handleFormSubmit = (formValues: PurchaseOrderFormValues) => {
    if (activeAction === 'edit' && selectedOrder) {
      updateMutation.mutate({ id: selectedOrder.id, values: formValues });
    } else {
      createMutation.mutate(formValues);
    }
  };

  // Prepara los datos para que el formulario se monte sin advertencias de tipos
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
    return <div className={styles.errorContainer}>Error al cargar el histórico transaccional de compras.</div>;
  }

  const getModalTitle = () => {
    if (activeAction === 'create') return 'Emitir Orden de Compra';
    if (activeAction === 'edit') return 'Modificar Orden de Compra';
    if (activeAction === 'clone') return 'Clonación de Pedido Recurrente';
    if (activeAction === 'delete') return 'Advertencia de Eliminación de Pedido';
    if (activeAction === 'detail') return 'Desglose de Orden de Compra';
    return undefined;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div className={styles.topToolbar}>
        <h1 className={styles.pageTitle}>Órdenes de Compra (Suministros)</h1>
        <FormButton variant="primary" onClick={() => openModal('create')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 18, height: 18 }}>
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Emitir Pedido
        </FormButton>
      </div>

      {/* SECCIÓN DE FILTROS BODEGUEROS */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Buscar Orden"
          name="search"
          value={filters.search}
          onChange={updateFilters}
          placeholder="Nº de orden o proveedor..."
        />
        <FilterSelect
          label="Estado de Gestión"
          name="status"
          value={filters.status}
          options={statusOptions}
          onChange={updateFilters}
        />
        <FilterSelect
          label="Filtrar por Proveedor"
          name="supplier"
          value={filters.supplier}
          options={supplierFilterOptions}
          onChange={updateFilters}
        />
      </div>

      {/* TABLA DE ÓRDENES DE COMPRA CABECERA */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Cargando histórico de adquisiciones de la bodega...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {ordersList.length === 0 ? (
              <tr><td colSpan={tableHeaders.length} className={styles.emptyState}>No hay registros de compras asociados a los filtros activos.</td></tr>
            ) : (
              ordersList.map((order) => (
                <GenericRow<PurchaseOrder>
                  key={order.id}
                  item={order}
                  columns={PURCHASE_ORDER_COLUMNS_CONFIG}
                  actions={{
                    view: () => openModal('detail', order.id),
                    edit: order.status === PURCHASE_ORDER_STATUS.CLOSED || order.status === PURCHASE_ORDER_STATUS.CANCELLED ? undefined : () => openModal('edit', order.id), 
                    delete: order.status === PURCHASE_ORDER_STATUS.CLOSED ? undefined : () => openModal('delete', order.id),
                    clone: () => openModal('clone', order.id)
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

      {/* PORTAL TRANSACCIONAL DE MODALES */}
      {activeAction && (
        <Modal onClose={closeModal} title={getModalTitle()} showCloseButton={activeAction !== 'delete'}>
          
          {/* Modal de Detalle Maestro-Detalle */}
          {activeAction === 'detail' && selectedOrder && (
            <GenericDetailView<PurchaseOrder>
              data={selectedOrder}
              badgeLabel="Estado:"
              badgeValue={PURCHASE_ORDER_STATUS_LABELS[selectedOrder.status]}
              titleLabel="Pedido:"
              titleValue={selectedOrder.order_number}
              codeLabel="Identificador Transaccional Único"
              codeValue={selectedOrder.order_number}
              isActive={selectedOrder.status !== PURCHASE_ORDER_STATUS.CANCELLED}
              fields={getPurchaseOrderDetailFields(selectedOrder)}
              onBack={closeModal}
              onEditClick={
                    selectedOrder.status === PURCHASE_ORDER_STATUS.CLOSED || selectedOrder.status === PURCHASE_ORDER_STATUS.CANCELLED 
                        ? () => {} 
                        : (o) => openModal('edit', o.id)
                    }
    
              onDeleteClick={
                selectedOrder.status === PURCHASE_ORDER_STATUS.CLOSED 
                    ? () => {} 
                    : (o) => openModal('delete', o.id)
                }            />
          )}

          {/* Formulario Unificado Dinámico (Crear / Editar / Clonar) */}
          {(activeAction === 'create' || activeAction === 'edit' || activeAction === 'clone') && (
            isLoadingClonePrefill ? (
              <div className={styles.loadingPlaceholder}>Extrayendo plantilla de compras recurrente...</div>
            ) : (
              <PurchaseForm 
                productInitialData={getFormInitialData()}
                onSubmit={handleFormSubmit}
                onCancel={closeModal}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
                activeAction={activeAction as 'create' | 'edit' | 'clone'}
              />
            )
          )}

          {/* Formulario de Borrado Crítico */}
          {activeAction === 'delete' && selectedOrder && (
            <GenericDeleteForm<number>
              id={selectedOrder.id}
              name={selectedOrder.order_number}
              subtitle={selectedOrder.supplier_name || `Proveedor ID: ${selectedOrder.supplier}`}
              codeValue={selectedOrder.order_number}
              {...PURCHASE_DELETE_CONFIG}
              onCancel={closeModal}
              onConfirm={(id) => deleteMutation.mutate(id)}
              isSubmitting={deleteMutation.isPending}
            />
          )}
        </Modal>
      )}
    </div>
  );
};