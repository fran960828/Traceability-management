// src/modules/products/components/containers/Label.container.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query'; 
import { useDataMutation, useDataTable } from '../../../shared/hooks';
import { FilterInput, FilterSelect } from '../../../shared/components/filters'; 
import { GenericTable, GenericRow } from '../../../shared/components/table';
import { Pagination } from '../../../shared/components/pagination/Pagination';
import { LabelService } from '../../services/label.service';
import { type LabelMaterial, type LabelPaginationResponse, type LabelFormValues, LABEL_TYPES } from '../../models/label.schema'; 

import { LabelForm } from '../forms/Label.create';
import { GenericDeleteForm } from '../../../shared/components/forms/forms.delete';
import { GenericDetailView } from '../../../shared/components/forms/forms.detail';
import { FormButton } from '../../../shared/components/formInputs/FormButton';
import { useModal } from '../../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../../shared/components/modal/Modal'; 

// 🌟 Importamos la metadata limpia del módulo de inventario
import { LABEL_COLUMNS_CONFIG, LABEL_DELETE_CONFIG, getLabelDetailFields } from '../../constants/label.constants';
import styles from '../../../supplier/components/Supplier.container.module.css';

export const LabelContainer: React.FC = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // 1. Estados de Red y Sincronización de Filtros
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<LabelPaginationResponse>({
    key: 'labels-inventory',
    fetchFn: LabelService.getAll,
  });

  const labelsList = data?.results || [];
  const totalCount = data?.count || 0;
  const selectedLabel = labelsList.find(lbl => lbl.id === Number(activeId));
  const tableHeaders = [...LABEL_COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  // Mapeos estáticos y dinámicos para los selectores de cabecera
  const labelTypeOptions = Object.values(LABEL_TYPES).map(type => ({ id: type, name: type }));
  const uniqueVintages = Array.from(new Set(labelsList.map(l => String(l.vintage)))).sort().map(v => ({ id: v, name: v }));

  // Query asíncrona dedicada al borrador de relevo de añadas de Django
  const { data: clonePrefillData, isLoading: isLoadingClonePrefill } = useQuery({
    queryKey: ['label-clone-prefill', activeId],
    queryFn: () => LabelService.clone(Number(activeId)),
    enabled: activeAction === 'clone' && !!activeId,
    staleTime: 0, 
  });

  // 2. Operaciones de Mutación Mutuamente Excluyentes
  const createMutation = useDataMutation({
    mutationFn: LabelService.create,
    invalidateKeys: ['labels-inventory'],
    onSuccess: () => closeModal(),
  });

  const updateMutation = useDataMutation({
    mutationFn: ({ id, values }: { id: number; values: LabelFormValues }) => LabelService.update(id, values),
    invalidateKeys: ['labels-inventory'],
    onSuccess: () => closeModal(),
  });

  const deleteMutation = useDataMutation({
    mutationFn: LabelService.delete,
    invalidateKeys: ['labels-inventory'],
    onSuccess: () => closeModal(),
  });

  const handleFormSubmit = (values: LabelFormValues) => {
    if (activeAction === 'edit' && selectedLabel) {
      updateMutation.mutate({ id: selectedLabel.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const getFormInitialData = () => {
    if (activeAction === 'edit') return selectedLabel;
    if (activeAction === 'clone') return clonePrefillData;
    return undefined;
  };

  if (isError) {
    return <div className={styles.errorContainer}>Error al cargar el catálogo de etiquetas de la bodega.</div>;
  }

  const getModalTitle = () => {
    if (activeAction === 'create') return 'Registrar Material';
    if (activeAction === 'edit') return 'Modificar Propiedades';
    if (activeAction === 'clone') return 'Clonación Inteligente de Añada';
    if (activeAction === 'delete') return 'Advertencia de Eliminación';
    if (activeAction === 'detail') return 'Ficha Técnica del Material';
    return undefined;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div className={styles.topToolbar}>
        <h1 className={styles.pageTitle}>Catálogo de Etiquetas</h1>
        <FormButton variant="primary" onClick={() => openModal('create')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 18, height: 18 }}>
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Añadir Material
        </FormButton>
      </div>

      {/* SECCIÓN DE FILTROS ESPECÍFICOS DE INVENTARIO */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Buscar Etiqueta"
          name="search"
          value={filters.search}
          onChange={updateFilters}
          placeholder="Nombre, código o marca..."
        />
        <FilterSelect
          label="Posición"
          name="label_type"
          value={filters.label_type}
          options={labelTypeOptions}
          onChange={updateFilters}
        />
        <FilterSelect
          label="Añada"
          name="vintage"
          value={filters.vintage}
          options={uniqueVintages}
          onChange={updateFilters}
        />
      </div>

      {/* SECCIÓN DE TABLA */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Cargando registros del catálogo de etiquetas...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {labelsList.length === 0 ? (
              <tr><td colSpan={tableHeaders.length} className={styles.emptyState}>No se han encontrado materiales de etiquetado.</td></tr>
            ) : (
              labelsList.map((label) => (
                <GenericRow<LabelMaterial>
                  key={label.id}
                  item={label}
                  columns={LABEL_COLUMNS_CONFIG}
                  actions={{
                    view: () => openModal('detail', label.id),
                    edit: () => openModal('edit', label.id), 
                    delete: () => openModal('delete', label.id),
                    clone: () => openModal('clone', label.id)
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

      {/* PORTAL DE MODALES CON COMPONENTES REUTILIZABLES POR CONFIGURACIÓN */}
      {activeAction && (
        <Modal onClose={closeModal} title={getModalTitle()} showCloseButton={activeAction !== 'delete'}>
          {activeAction === 'detail' && selectedLabel && (
            <GenericDetailView<LabelMaterial>
              data={selectedLabel}
              badgeLabel="Posición:"
              badgeValue={selectedLabel.label_type_display}
              titleLabel="Material:"
              titleValue={selectedLabel.name}
              codeLabel="Código único de sistema"
              codeValue={selectedLabel.internal_code}
              isActive={selectedLabel.is_active}
              fields={getLabelDetailFields(selectedLabel)}
              onBack={closeModal}
              onEditClick={(lbl) => openModal('edit', lbl.id)}
              onDeleteClick={(lbl) => openModal('delete', lbl.id)}
            />
          )}

          {(activeAction === 'create' || activeAction === 'edit' || activeAction === 'clone') && (
            isLoadingClonePrefill ? (
              <div className={styles.loadingPlaceholder}>Preparando borrador de clonación...</div>
            ) : (
              <LabelForm 
                productInitialData={getFormInitialData()}
                onSubmit={handleFormSubmit}
                onCancel={closeModal}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
                activeAction={activeAction as 'create' | 'edit' | 'clone'}
              />
            )
          )}

          {activeAction === 'delete' && selectedLabel && (
            <GenericDeleteForm<number>
              id={selectedLabel.id}
              name={selectedLabel.name}
              subtitle={selectedLabel.brand_reference}
              codeValue={selectedLabel.internal_code}
              {...LABEL_DELETE_CONFIG}
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