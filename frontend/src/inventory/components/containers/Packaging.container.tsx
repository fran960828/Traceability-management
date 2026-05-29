// src/modules/inventory/components/containers/Packaging.container.tsx
import React from 'react';
import { useDataMutation, useDataTable } from '../../../shared/hooks';
import { FilterInput, FilterSelect } from '../../../shared/components/filters'; 
import { GenericTable, GenericRow } from '../../../shared/components/table';
import { Pagination } from '../../../shared/components/pagination/Pagination';
import { PackagingService } from '../../services/packaging.service';
import { 
  type PackagingMaterial, 
  type PackagingPaginationResponse, 
  type PackagingFormValues, 
  PACKAGING_TYPES 
} from '../../models/packaging.schema'; 

import { PackagingForm } from '../forms/Packaging.create';
import { GenericDeleteForm } from '../../../shared/components/forms/forms.delete';
import { GenericDetailView } from '../../../shared/components/forms/forms.detail';
import { FormButton } from '../../../shared/components/formInputs/FormButton';
import { useModal } from '../../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../../shared/components/modal/Modal'; 

// 🌟 Importamos la metadata purificada del módulo de acondicionamiento
import { 
  PACKAGING_COLUMNS_CONFIG, 
  PACKAGING_DELETE_CONFIG, 
  getPackagingDetailFields 
} from '../../constants/packaging.constants';
import styles from '../../../supplier/components/Supplier.container.module.css';

export const PackagingContainer: React.FC = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // 1. Estados de Red y Sincronización de Filtros (useDataTable)
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<PackagingPaginationResponse>({
    key: 'packaging-inventory',
    fetchFn: PackagingService.getAll,
  });

  const packagingList = data?.results || [];
  const totalCount = data?.count || 0;
  const selectedPackaging = packagingList.find(item => item.id === Number(activeId));
  const tableHeaders = [...PACKAGING_COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  // Mapeo dinámico para el dropdown de tipos de material en la cabecera
  const packagingTypeOptions = Object.values(PACKAGING_TYPES).map(type => ({ 
    id: type, 
    name: type === 'VIDRIO' ? 'Vidrio (Botellas)' : 
          type === 'CIERRE' ? 'Cierres (Corchos/Tapones)' : 
          type === 'EMBALAJE' ? 'Embalaje Seco (Cajas)' : type
  }));

  // 2. Operaciones de Mutación asíncronas de TanStack Query
  const createMutation = useDataMutation({
    mutationFn: PackagingService.create,
    invalidateKeys: ['packaging-inventory'],
    onSuccess: () => closeModal(),
  });

  const updateMutation = useDataMutation({
    mutationFn: ({ id, values }: { id: number; values: PackagingFormValues }) => 
      PackagingService.update(id, values),
    invalidateKeys: ['packaging-inventory'],
    onSuccess: () => closeModal(),
  });

  const deleteMutation = useDataMutation({
    mutationFn: PackagingService.delete,
    invalidateKeys: ['packaging-inventory'],
    onSuccess: () => closeModal(),
  });

  const handleFormSubmit = (values: PackagingFormValues) => {
    if (activeAction === 'edit' && selectedPackaging) {
      updateMutation.mutate({ id: selectedPackaging.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isError) {
    return <div className={styles.errorContainer}>Error al cargar el almacén de materiales de acondicionamiento.</div>;
  }

  const getModalTitle = () => {
    if (activeAction === 'create') return 'Registrar Material';
    if (activeAction === 'edit') return 'Modificar Propiedades';
    if (activeAction === 'delete') return 'Advertencia de Eliminación';
    if (activeAction === 'detail') return 'Ficha Técnica del Material';
    return undefined;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div className={styles.topToolbar}>
        <h1 className={styles.pageTitle}>Materiales de Acondicionamiento</h1>
        <FormButton variant="primary" onClick={() => openModal('create')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 18, height: 18 }}>
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Añadir Material
        </FormButton>
      </div>

      {/* SECCIÓN DE FILTROS CONFIGURADOS SEGÚN EL VIEWSET DE DJANGO */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Buscar Material"
          name="search"
          value={filters.search}
          onChange={updateFilters}
          placeholder="Nombre o código PAC..."
        />
        <FilterSelect
          label="Tipo de Material"
          name="packaging_type"
          value={filters.packaging_type}
          options={packagingTypeOptions}
          onChange={updateFilters}
        />
      </div>

      {/* SECCIÓN DE TABLA AUTOMATIZADA */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Cargando registros de stock seco...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {packagingList.length === 0 ? (
              <tr><td colSpan={tableHeaders.length} className={styles.emptyState}>No se han encontrado materiales de packaging con los criterios seleccionados.</td></tr>
            ) : (
              packagingList.map((item) => (
                <GenericRow<PackagingMaterial>
                  key={item.id}
                  item={item}
                  columns={PACKAGING_COLUMNS_CONFIG}
                  actions={{
                    view: () => openModal('detail', item.id),
                    edit: () => openModal('edit', item.id), 
                    delete: () => openModal('delete', item.id),
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

      {/* PORTAL DE MODALES COMPARTIDOS POR CONFIGURACIÓN */}
      {activeAction && (
        <Modal onClose={closeModal} title={getModalTitle()} showCloseButton={activeAction !== 'delete'}>
          
          {/* 🔄 DETALLE GENÉRICO REUTILIZADO */}
          {activeAction === 'detail' && selectedPackaging && (
            <GenericDetailView<PackagingMaterial>
              data={selectedPackaging}
              badgeLabel="Tipo:"
              badgeValue={selectedPackaging.packaging_type_display}
              titleLabel="Material:"
              titleValue={selectedPackaging.name}
              codeLabel="Código único de sistema"
              codeValue={selectedPackaging.internal_code}
              isActive={selectedPackaging.is_active}
              fields={getPackagingDetailFields(selectedPackaging)}
              onBack={closeModal}
              onEditClick={(item) => openModal('edit', item.id)}
              onDeleteClick={(item) => openModal('delete', item.id)}
            />
          )}

          {/* FORMULARIO ESPECÍFICO CON SUS CONDICIONALES INTERNOS */}
          {(activeAction === 'create' || activeAction === 'edit') && (
            <PackagingForm 
              productInitialData={activeAction === 'edit' ? selectedPackaging : undefined}
              onSubmit={handleFormSubmit}
              onCancel={closeModal}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
              activeAction={activeAction as 'create' | 'edit'}
            />
          )}

          {/* 🔄 BORRADO GENÉRICO REUTILIZADO */}
          {activeAction === 'delete' && selectedPackaging && (
            <GenericDeleteForm<number>
              id={selectedPackaging.id}
              name={selectedPackaging.name}
              subtitle={selectedPackaging.specification}
              codeValue={selectedPackaging.internal_code}
              {...PACKAGING_DELETE_CONFIG}
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