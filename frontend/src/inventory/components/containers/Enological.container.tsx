// src/modules/inventory/components/containers/Enological.container.tsx
import React from 'react';
import { useDataMutation, useDataTable } from '../../../shared/hooks';
import { FilterInput, FilterSelect } from '../../../shared/components/filters'; 
import { GenericTable, GenericRow } from '../../../shared/components/table';
import { Pagination } from '../../../shared/components/pagination/Pagination';
import { EnologicalService } from '../../services/enological.service';
import { 
  type EnologicalMaterial, 
  type EnologicalPaginationResponse, 
  type EnologicalFormValues, 
  ENOLOGICAL_TYPES 
} from '../../models/enological.schema'; 

import { EnologicalForm } from '../forms/Enological.create';
import { GenericDeleteForm } from '../../../shared/components/forms/forms.delete';
import { GenericDetailView } from '../../../shared/components/forms/forms.detail';
import { FormButton } from '../../../shared/components/formInputs/FormButton';
import { useModal } from '../../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../../shared/components/modal/Modal'; 

// 🌟 Importamos los metadatos específicos del laboratorio enológico
import { 
  ENOLOGICAL_COLUMNS_CONFIG, 
  ENOLOGICAL_DELETE_CONFIG, 
  getEnologicalDetailFields 
} from '../../constants/enological.constants';
import styles from '../../../supplier/components/Supplier.container.module.css';

export const EnologicalContainer: React.FC = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // 1. Estados de Red y Sincronización de Filtros analíticos de bodega
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<EnologicalPaginationResponse>({
    key: 'enological-inventory',
    fetchFn: EnologicalService.getAll,
  });

  const enologicalList = data?.results || [];
  const totalCount = data?.count || 0;
  const selectedEnological = enologicalList.find(item => item.id === Number(activeId));
  const tableHeaders = [...ENOLOGICAL_COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  // Mapeo dinámico para el dropdown de categorías en la barra de herramientas superior
  const enologicalTypeOptions = Object.values(ENOLOGICAL_TYPES).map(type => ({ 
    id: type, 
    name: type === 'ESTABILIZANTE' ? 'Estabilizantes (Gomas/Manoproteínas)' : 
          type === 'CONSERVANTE' ? 'Conservantes (Sulfitos/Ascórbico)' : 
          type === 'ACIDIFICANTE' ? 'Acidificantes y Correctores' : type
  }));

  // 2. Operaciones de Mutación asíncronas mapeadas con TanStack Query
  const createMutation = useDataMutation({
    mutationFn: EnologicalService.create,
    invalidateKeys: ['enological-inventory'],
    onSuccess: () => closeModal(),
  });

  const updateMutation = useDataMutation({
    mutationFn: ({ id, values }: { id: number; values: EnologicalFormValues }) => 
      EnologicalService.update(id, values),
    invalidateKeys: ['enological-inventory'],
    onSuccess: () => closeModal(),
  });

  const deleteMutation = useDataMutation({
    mutationFn: EnologicalService.delete,
    invalidateKeys: ['enological-inventory'],
    onSuccess: () => closeModal(),
  });

  const handleFormSubmit = (values: EnologicalFormValues) => {
    if (activeAction === 'edit' && selectedEnological) {
      updateMutation.mutate({ id: selectedEnological.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isError) {
    return <div className={styles.errorContainer}>Error al cargar el almacén de productos enológicos de la bodega.</div>;
  }

  const getModalTitle = () => {
    if (activeAction === 'create') return 'Registrar Producto';
    if (activeAction === 'edit') return 'Modificar Propiedades';
    if (activeAction === 'delete') return 'Advertencia de Eliminación';
    if (activeAction === 'detail') return 'Ficha Técnica de Laboratorio';
    return undefined;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div className={styles.topToolbar}>
        <h1 className={styles.pageTitle}>Productos Enológicos</h1>
        <FormButton variant="primary" onClick={() => openModal('create')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 18, height: 18 }}>
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Añadir Producto
        </FormButton>
      </div>

      {/* SECCIÓN DE FILTROS ENOLÓGICOS */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Buscar Producto"
          name="search"
          value={filters.search}
          onChange={updateFilters}
          placeholder="Nombre o código ENO..."
        />
        <FilterSelect
          label="Clasificación"
          name="enological_type"
          value={filters.enological_type}
          options={enologicalTypeOptions}
          onChange={updateFilters}
        />
      </div>

      {/* SECCIÓN DE TABLA DE INVENTARIO */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Cargando registros de reactivos y aditivos...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {enologicalList.length === 0 ? (
              <tr><td colSpan={tableHeaders.length} className={styles.emptyState}>No se han encontrado productos enológicos con los criterios de búsqueda actuales.</td></tr>
            ) : (
              enologicalList.map((item) => (
                <GenericRow<EnologicalMaterial>
                  key={item.id}
                  item={item}
                  columns={ENOLOGICAL_COLUMNS_CONFIG}
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

      {/* PORTAL DE MODALES CONMUTABLES */}
      {activeAction && (
        <Modal onClose={closeModal} title={getModalTitle()} showCloseButton={activeAction !== 'delete'}>
          
          {/* VISTA DE DETALLE REUTILIZADA */}
          {activeAction === 'detail' && selectedEnological && (
            <GenericDetailView<EnologicalMaterial>
              data={selectedEnological}
              badgeLabel="Clasificación:"
              badgeValue={selectedEnological.enological_type_display}
              titleLabel="Producto:"
              titleValue={selectedEnological.name}
              codeLabel="Código único de trazabilidad"
              codeValue={selectedEnological.internal_code}
              isActive={selectedEnological.is_active}
              fields={getEnologicalDetailFields(selectedEnological)}
              onBack={closeModal}
              onEditClick={(item) => openModal('edit', item.id)}
              onDeleteClick={(item) => openModal('delete', item.id)}
            />
          )}

          {/* FORMULARIO LINEAL DE REGISTRO */}
          {(activeAction === 'create' || activeAction === 'edit') && (
            <EnologicalForm 
              productInitialData={activeAction === 'edit' ? selectedEnological : undefined}
              onSubmit={handleFormSubmit}
              onCancel={closeModal}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
              activeAction={activeAction as 'create' | 'edit'}
            />
          )}

          {/* ADVERTENCIA DE ELIMINACIÓN BAJO CONTRATO */}
          {activeAction === 'delete' && selectedEnological && (
            <GenericDeleteForm<number>
              id={selectedEnological.id}
              name={selectedEnological.name}
              subtitle={selectedEnological.commercial_format}
              codeValue={selectedEnological.internal_code}
              {...ENOLOGICAL_DELETE_CONFIG}
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