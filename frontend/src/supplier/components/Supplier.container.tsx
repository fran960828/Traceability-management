// src/modules/suppliers/pages/SuppliersPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query'; 
import { useDataMutation, useDataTable } from '../../shared/hooks';
import { FilterInput, FilterSelect } from '../../shared/components/filters'; 
import { GenericTable, GenericRow } from '../../shared/components/table';
import { Pagination } from '../../shared/components/pagination/Pagination';
import { CategoryService, SupplierService } from '../services';
import type { Supplier, SupplierPaginationResponse, SupplierFormValues } from '../models'; 

import { GenericDeleteForm } from '../../shared/components/forms/forms.delete';
import { GenericDetailView } from '../../shared/components/forms/forms.detail';
import { SupplierForm } from './forms';
import { FormButton } from '../../shared/components/formInputs/FormButton';
import { useModal } from '../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../shared/components/modal/Modal'; 

// 🌟 Importamos la metadata purificada del módulo
import { SUPPLIER_COLUMNS_CONFIG, SUPPLIER_DELETE_CONFIG, getSupplierDetailFields } from '../constants/supplier.constants';
import styles from './Supplier.container.module.css';

export const SuppliersContainer: React.FC = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // 1. Carga de Maestros y Orquestación de la Tabla
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories-master'],
    queryFn: CategoryService.getCategories,
    staleTime: 30 * 60 * 1000, 
  });

  const { data, isLoading, isError, filters, updateFilters } = useDataTable<SupplierPaginationResponse>({
    key: 'suppliers',
    fetchFn: SupplierService.getAll,
  });

  const suppliersList = data?.results || [];
  const totalCount = data?.count || 0;
  const selectedSupplier = suppliersList.find(sup => sup.id === Number(activeId));
  
  const tableHeaders = [...SUPPLIER_COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  // 2. Operaciones de Red (Mutaciones CRUD)
  const createMutation = useDataMutation({
    mutationFn: SupplierService.create,
    invalidateKeys: ['suppliers'],
    onSuccess: () => closeModal(),
  });

  const updateMutation = useDataMutation({
    mutationFn: ({ id, values }: { id: number; values: SupplierFormValues }) => SupplierService.update(id, values),
    invalidateKeys: ['suppliers'],
    onSuccess: () => closeModal(),
  });

  const deleteMutation = useDataMutation({
    mutationFn: SupplierService.delete,
    invalidateKeys: ['suppliers'],
    onSuccess: () => closeModal(),
  });

  const handleFormSubmit = (values: SupplierFormValues) => {
    if (activeAction === 'edit' && selectedSupplier) {
      updateMutation.mutate({ id: selectedSupplier.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isError) {
    return <div className={styles.errorContainer}>Error al cargar los proveedores de la bodega.</div>;
  }

  const getModalTitle = () => {
    if (activeAction === 'create') return 'Registrar Proveedor';
    if (activeAction === 'edit') return 'Modificar Proveedor';
    if (activeAction === 'delete') return 'Advertencia de Seguridad';
    if (activeAction === 'detail') return 'Ficha Técnica del Proveedor';
    return undefined;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div className={styles.topToolbar}>
        <h1 className={styles.pageTitle}>Proveedores de Bodega</h1>
        <FormButton variant="primary" onClick={() => openModal('create')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 18, height: 18 }}>
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Añadir Proveedor
        </FormButton>
      </div>

      {/* SECCIÓN DE FILTROS */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Buscar Proveedor"
          name="search"
          value={filters.search}
          onChange={updateFilters}
          placeholder='Introduce nombre o CIF'
        />
        <FilterSelect
          label="Categoría"
          name="category"
          value={filters.category ? String(filters.category) : undefined}
          options={categories?.results || []}
          onChange={updateFilters}
          isLoading={isLoadingCategories}
        />
      </div>

      {/* SECCIÓN DE TABLA */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Cargando registros de proveedores...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {suppliersList.length === 0 ? (
              <tr><td colSpan={tableHeaders.length} className={styles.emptyState}>No se han encontrado proveedores.</td></tr>
            ) : (
              suppliersList.map((supplier) => (
                <GenericRow<Supplier>
                  key={supplier.id}
                  item={supplier}
                  columns={SUPPLIER_COLUMNS_CONFIG}
                  actions={{
                    view: () => openModal('detail', supplier.id),
                    edit: () => openModal('edit', supplier.id), 
                    delete: () => openModal('delete', supplier.id),
                  }}
                />
              ))
            )}
          </GenericTable>
        )}
      </div>

      {/* SECCIÓN DE PAGINACIÓN */}
      <footer className={styles.footerSection}>
        <Pagination
          count={totalCount}
          currentPage={Number(filters.page) || 1}
          onPageChange={(newPage) => updateFilters({ page: newPage })}
          pageSize={10} 
        />
      </footer>

      {/* GESTIÓN DE MODALES CONFIGURABLES */}
      {activeAction && (
        <Modal onClose={closeModal} title={getModalTitle()} showCloseButton={activeAction !== 'delete'}>
          {activeAction === 'detail' && selectedSupplier && (
            <GenericDetailView<Supplier>
              data={selectedSupplier}
              badgeLabel="Categoría:"
              badgeValue={selectedSupplier.category_name}
              titleLabel="Nombre:"
              titleValue={selectedSupplier.name}
              codeLabel="Código del sistema"
              codeValue={selectedSupplier.supplier_code}
              isActive={selectedSupplier.is_active}
              fields={getSupplierDetailFields(selectedSupplier)}
              onBack={closeModal}
              onEditClick={(sup) => openModal('edit', sup.id)}
              onDeleteClick={(sup) => openModal('delete', sup.id)}
            />
          )}

          {(activeAction === 'create' || activeAction === 'edit') && (
            <SupplierForm 
              supplierInitialData={selectedSupplier}
              onSubmit={handleFormSubmit}
              onCancel={closeModal}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          )}

          {activeAction === 'delete' && selectedSupplier && (
            <GenericDeleteForm<number>
              id={selectedSupplier.id}
              name={selectedSupplier.name}
              subtitle={selectedSupplier.tax_id}
              codeValue={selectedSupplier.supplier_code}
              {...SUPPLIER_DELETE_CONFIG}
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