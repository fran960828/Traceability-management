// src/modules/inventory/components/containers/ReceptionContainer.tsx
import React from 'react';
import { useDataMutation, useDataTable } from '../../shared/hooks';
import { FilterInput, FilterSelect } from '../../shared/components/filters'; 
import { GenericTable } from '../../shared/components/table';
import { Pagination } from '../../shared/components/pagination/Pagination';
import { PurchaseService } from '../../purchase/services/purchase.service';
import { SupplierService } from '../../supplier/services/supplier.service';
import { ReceptionService } from '../services/reception.service'; // Tu servicio de inventario

import {  
  type PurchaseOrderPaginationResponse, 
  PURCHASE_ORDER_STATUS,
  PURCHASE_ORDER_STATUS_LABELS
} from '../../purchase/models/purchase.schema'; 
import type { BulkReceptionValues } from '../models/reception.schema';

import { ReceptionForm } from './forms/reception.confirm';
import { FormButton } from '../../shared/components/formInputs/FormButton';
import { useModal } from '../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../shared/components/modal/Modal'; 

// Reutilizamos las columnas o declaramos las específicas del muelle de descarga
import { PURCHASE_ORDER_COLUMNS_CONFIG } from '../../purchase/constants/purchase.constants';
import styles from '../../supplier/components/Supplier.container.module.css';

export const ReceptionContainer: React.FC = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // 1. Carga y sincronización analítica de órdenes de compra con Django
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<PurchaseOrderPaginationResponse>({
    key: 'reception-purchase-orders',
    fetchFn: PurchaseService.getAll, // El muelle consulta las órdenes existentes
  });

  // Catálogo maestro de proveedores para alimentar el filtro dinámico del muelle
  const { data: suppliersData } = useDataTable({
    key: 'reception-suppliers-filter',
    fetchFn: SupplierService.getAll,
  });

  const ordersList = data?.results || [];
  const totalCount = data?.count || 0;
  
  // Localizamos la orden seleccionada para pasarle sus líneas internas al formulario
  const selectedOrder = ordersList.find(o => o.id === Number(activeId));
  
  const tableHeaders = [...PURCHASE_ORDER_COLUMNS_CONFIG.map(col => col.header), 'Acción'];

  // Selectores dinámicos para los filtros de búsqueda
  const statusOptions = Object.entries(PURCHASE_ORDER_STATUS_LABELS).map(([key, value]) => ({
    id: key,
    name: value,
  }));
  
  const supplierFilterOptions = (suppliersData?.results || []).map(s => ({
    id: String(s.id),
    name: s.name,
  }));

  // 2. Única Mutación requerida: Registro masivo de entrada física de mercancía 🚚
  const receptionMutation = useDataMutation({
    mutationFn: (values: BulkReceptionValues) => ReceptionService.bulkReceive(values),
    invalidateKeys: ['reception-purchase-orders', 'locations-select'],
    onSuccess: () => closeModal(),
  });

  const handleReceptionSubmit = (formValues: BulkReceptionValues) => {
    receptionMutation.mutate(formValues);
  };

  if (isError) {
    return <div className={styles.errorContainer}>Error al recuperar las órdenes de compra en el muelle de descarga.</div>;
  }

  return (
    <div className={styles.pageWrapper}>
      
      {/* BARRA DE TITULACIÓN INFORMATIVA (Sin botón "Añadir") */}
      <div className={styles.topToolbar}>
        <h1 className={styles.pageTitle}>Muelle de Recepción e Inventario</h1>
      </div>

      {/* SECCIÓN DE FILTROS BODEGUEROS */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Buscar Pedido o Albarán"
          name="search"
          value={filters.search}
          onChange={updateFilters}
          placeholder="Nº orden o proveedor..."
        />
        <FilterSelect
          label="Estado del Pedido"
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

      {/* TABLA DE ÓRDENES DISPONIBLES PARA DESCARGA */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Consultando órdenes de compra pendientes de muelle...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {ordersList.length === 0 ? (
              <tr>
                <td colSpan={tableHeaders.length} className={styles.emptyState}>
                  No hay órdenes de compra que coincidan con los criterios de búsqueda.
                </td>
              </tr>
            ) : (
              ordersList.map((order) => {
                // Evaluamos si el pedido está cerrado o cancelado para mitigar falsas recepciones
                const isClosed = order.status === PURCHASE_ORDER_STATUS.CLOSED || order.status === PURCHASE_ORDER_STATUS.CANCELLED;

                return (
                  <tr key={order.id} className={styles.tableRow}>
                    {PURCHASE_ORDER_COLUMNS_CONFIG.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(order) : (order as any)[col.key]}
                      </td>
                    ))}
                    {/* Celda de acción personalizada: Botón único para abrir el muelle */}
                    <td>
                      <FormButton
                        variant={isClosed ? 'secondary' : 'primary'}
                        onClick={() => openModal('receive', order.id)}
                        disabled={isClosed}
                      >
                        {isClosed ? 'Completado' : 'Recibir'}
                      </FormButton>
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

      {/* PORTAL TRANSACCIONAL DEL MODAL DE ENTRADA */}
      {activeAction === 'receive' && selectedOrder && (
        <Modal 
          onClose={closeModal} 
          title={`Auditoría de Entrada - ${selectedOrder.order_number}`}
          showCloseButton
        >
          <ReceptionForm 
            purchaseOrderData={selectedOrder}
            onSubmit={handleReceptionSubmit}
            onCancel={closeModal}
            isSubmitting={receptionMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
};