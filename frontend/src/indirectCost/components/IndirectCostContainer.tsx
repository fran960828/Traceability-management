// src/modules/pricing/components/containers/IndirectCostContainer.tsx
import React from 'react';
import { useDataMutation, useDataTable } from '../../shared/hooks';
import { FilterInput } from '../../shared/components/filters'; 
import { GenericTable, GenericRow } from '../../shared/components/table';
import { Pagination } from '../../shared/components/pagination/Pagination';
import { IndirectCostService } from '../services/indirectCost.service';

import type { 
  IndirectCostConfig, 
  IndirectCostConfigPaginationResponse, 
  IndirectCostConfigFormValues 
} from '../models/indirectCost.schema'; 

import { GenericDeleteForm } from '../../shared/components/forms/forms.delete';
import { GenericDetailView } from '../../shared/components/forms/forms.detail';
import { IndirectCostForm } from './forms/IndirectCostForm';
import { FormButton } from '../../shared/components/formInputs/FormButton';
import { useModal } from '../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../shared/components/modal/Modal'; 

import { 
  INDIRECT_COST_COLUMNS_CONFIG, 
  INDIRECT_COST_DELETE_CONFIG, 
  getIndirectCostDetailFields 
} from '../constants/indirectCost.constants';
import styles from '../../supplier/components/Supplier.container.module.css';

export const IndirectCostContainer: React.FC = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // 1. Carga y Orquestación del Listado Paginado de Tasas
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<IndirectCostConfigPaginationResponse>({
    key: 'indirect-costs',
    fetchFn: IndirectCostService.getAll,
  });

  const configsList = data?.results || [];
  const totalCount = data?.count || 0;
  const selectedConfig = configsList.find(cfg => cfg.id === Number(activeId));

  const tableHeaders = [...INDIRECT_COST_COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  // 2. Mutaciones Asíncronas (TanStack Query)
  const createMutation = useDataMutation({
    mutationFn: IndirectCostService.create,
    invalidateKeys: ['indirect-costs'],
    onSuccess: () => closeModal(),
  });

  const updateMutation = useDataMutation({
    mutationFn: ({ id, values }: { id: number; values: IndirectCostConfigFormValues }) =>
      IndirectCostService.update(id, values),
    invalidateKeys: ['indirect-costs'],
    onSuccess: () => closeModal(),
  });

  const deleteMutation = useDataMutation({
    mutationFn: IndirectCostService.delete,
    invalidateKeys: ['indirect-costs'],
    onSuccess: () => closeModal(),
  });

  const handleFormSubmit = (values: IndirectCostConfigFormValues) => {
    if (activeAction === 'edit' && selectedConfig) {
      updateMutation.mutate({ id: selectedConfig.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isError) {
    return <div className={styles.errorContainer}>Error al cargar las configuraciones de costes indirectos.</div>;
  }

  const getModalTitle = () => {
    if (activeAction === 'create') return 'Nueva Configuración de Tasas';
    if (activeAction === 'edit') return 'Modificar Tasas Indirectas';
    if (activeAction === 'delete') return 'Advertencia de Eliminación';
    if (activeAction === 'detail') return 'Desglose de Tasas e Impacto';
    return undefined;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div className={styles.topToolbar}>
        <h1 className={styles.pageTitle}>Costes Indirectos y Tasas Generales</h1>
        <FormButton variant="primary" onClick={() => openModal('create')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 18, height: 18, marginRight: 6 }}>
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Nueva Configuración
        </FormButton>
      </div>

      {/* SECCIÓN DE FILTROS DE NAVEGACIÓN */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Buscar Configuración"
          name="search"
          value={filters.search}
          onChange={updateFilters}
          placeholder="Nombre o ejercicio (ej: Tasas 2026)..."
        />
      </div>

      {/* SECCIÓN DE TABLA MAESTRA */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Cargando configuraciones de costes indirectos...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {configsList.length === 0 ? (
              <tr>
                <td colSpan={tableHeaders.length} className={styles.emptyState}>
                  No se han localizado configuraciones de tasas indirectas.
                </td>
              </tr>
            ) : (
              configsList.map((config) => (
                <GenericRow<IndirectCostConfig>
                  key={config.id}
                  item={config}
                  columns={INDIRECT_COST_COLUMNS_CONFIG}
                  actions={{
                    view: () => openModal('detail', config.id),
                    edit: () => openModal('edit', config.id),
                    delete: () => openModal('delete', config.id),
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
          
          {/* Vista Detallada */}
          {activeAction === 'detail' && selectedConfig && (
            <GenericDetailView<IndirectCostConfig>
              data={selectedConfig}
              badgeLabel="Estado:"
              badgeValue={selectedConfig.is_active ? 'Activa' : 'Inactiva'}
              titleLabel="Esquema:"
              titleValue={selectedConfig.name}
              codeLabel="Identificador"
              codeValue={String(selectedConfig.id)}
              isActive={selectedConfig.is_active}
              fields={getIndirectCostDetailFields(selectedConfig)}
              onBack={closeModal}
              onEditClick={(cfg) => openModal('edit', cfg.id)}
              onDeleteClick={(cfg) => openModal('delete', cfg.id)}
            />
          )}

          {/* Formulario Crear / Editar */}
          {(activeAction === 'create' || activeAction === 'edit') && (
            <IndirectCostForm 
              initialData={selectedConfig}
              onSubmit={handleFormSubmit}
              onCancel={closeModal}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          )}

          {/* Formulario de Borrado */}
          {activeAction === 'delete' && selectedConfig && (
            <GenericDeleteForm<number>
              id={selectedConfig.id}
              name={selectedConfig.name}
              subtitle={`ID: ${selectedConfig.id}`}
              codeValue={String(selectedConfig.id)}
              {...INDIRECT_COST_DELETE_CONFIG}
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