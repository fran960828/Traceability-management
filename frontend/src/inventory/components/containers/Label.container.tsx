import React from 'react';
import { useQuery } from '@tanstack/react-query'; 
import { useDataMutation, useDataTable } from '../../../shared/hooks';
import { FilterInput, FilterSelect } from '../../../shared/components/filters'; 
import { GenericTable, GenericRow } from '../../../shared/components/table';
import { Pagination } from '../../../shared/components/pagination/Pagination';
import { LabelService } from '../../services/label.service';
import { type LabelMaterial, type LabelPaginationResponse, type LabelFormValues, LABEL_TYPES } from '../../models/label.schema'; 

// Subcomponentes de etiquetas estructurados en simetría con proveedores
import { LabelForm } from '../forms/Label.create';
import { LabelDeleteForm } from '../forms/Label.delete';
import { LabelDetailView } from '../forms/Label.detail';
import { FormButton } from '../../../shared/components/formularios/FormButton';

// Sistema de Modales global basado en Portales y URLs
import { useModal } from '../../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../../shared/components/modal/Modal'; 

import styles from './Label.container.module.css';

const COLUMNS_CONFIG = [
  { header: 'Código', key: 'internal_code' as const },
  { header: 'Nombre Material', key: 'name' as const },
  { header: 'Referencia Vino', key: 'brand_reference' as const },
  { header: 'Añada', key: 'vintage' as const }, 
  { header: 'Posición', key: 'label_type_display' as const },
  { 
    header: 'Stock Actual', 
    key: 'current_stock' as const,
    render: (item: LabelMaterial) => (
      <span style={{ fontWeight: item.is_low_stock ? 'bold' : 'normal', color: item.is_low_stock ? '#dc3545' : 'inherit' }}>
        {item.current_stock} {item.unit_mesure_display.toLowerCase()}
        {item.is_low_stock && ' ⚠️'}
      </span>
    )
  },
  { 
    header: 'Estado', 
    key: 'is_active' as const,
    render: (item: LabelMaterial) => (
      <span className={`${styles.badge} ${item.is_active ? styles.active : styles.inactive}`}>
        {item.is_active ? 'Activo' : 'Inactivo'}
      </span>
    )
  },
];

export const LabelContainer: React.FC = () => {
  // Extraemos el control de estados persistido en los query parameters
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // Hook genérico de tabla conectado al endpoint de inventario
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<LabelPaginationResponse>({
    key: 'labels-inventory',
    fetchFn: LabelService.getAll,
  });

  const labelsList = data?.results || [];
  const totalCount = data?.count || 0;
  const currentPage = Number(filters.page) || 1;

  const tableHeaders = [...COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  // Mapeamos las opciones estáticas del enum de tipos para el filtro superior
  const labelTypeOptions = Object.values(LABEL_TYPES).map(type => ({
    id: type,
    name: type
  }));

  // Generamos un listado dinámico de añadas basado en los datos de la bodega para filtrar
  const uniqueVintages = Array.from(new Set(labelsList.map(l => String(l.vintage)))).sort().map(v => ({
    id: v,
    name: v
  }));

  const handlePageChange = (newPage: number) => {
    updateFilters({ page: newPage });
  };

  // Buscamos el material seleccionado localmente para las vistas de lectura/edición/borrado
  const selectedLabel = labelsList.find(lbl => lbl.id === Number(activeId));

  // 🌟 QUERY EXTRA: Recuperamos el pre-llenado de clonación asíncrono desde Django si la acción es 'clone'
  const { data: clonePrefillData, isLoading: isLoadingClonePrefill } = useQuery({
    queryKey: ['label-clone-prefill', activeId],
    queryFn: () => LabelService.clone(Number(activeId)),
    enabled: activeAction === 'clone' && !!activeId,
    staleTime: 0, // Forzamos a que siempre consulte los datos más frescos
  });

  // Mutaciones CRUD controladas por el hook genérico de Ontalba
  const createMutation = useDataMutation({
    mutationFn: LabelService.create,
    invalidateKeys: ['labels-inventory'],
    onSuccess: () => closeModal(),
  });

  const updateMutation = useDataMutation({
    mutationFn: ({ id, values }: { id: number; values: LabelFormValues }) => 
      LabelService.update(id, values),
    invalidateKeys: ['labels-inventory'],
    onSuccess: () => closeModal(),
  });

  const deleteMutation = useDataMutation({
    mutationFn: LabelService.delete,
    invalidateKeys: ['labels-inventory'],
    onSuccess: () => closeModal(),
  });

  // Gestiona centralizadamente el envío final de datos hacia Django
  const handleFormSubmit = (values: LabelFormValues) => {
    if (activeAction === 'edit' && selectedLabel) {
      updateMutation.mutate({ id: selectedLabel.id, values });
    } else {
      // Tanto 'create' como 'clone' se consolidan mediante una inserción limpia (POST)
      createMutation.mutate(values);
    }
  };

  // Resolvemos qué datos inyectar en el formulario de forma transparente
  const getFormInitialData = () => {
    if (activeAction === 'edit') return selectedLabel;
    if (activeAction === 'clone') return clonePrefillData; // Inyectamos el payload purificado por el backend
    return undefined; // Modo creación arranca limpio con los defaults de las constantes
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
          placeholder="Todas las posiciones"
        />
        <FilterSelect
          label="Añada"
          name="vintage"
          value={filters.vintage}
          options={uniqueVintages}
          onChange={updateFilters}
          placeholder="Todos los años"
        />
      </div>

      {/* SECCIÓN DE TABLA */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Cargando registros del catálogo de etiquetas...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {labelsList.length === 0 ? (
              <tr>
                <td colSpan={tableHeaders.length} className={styles.emptyState}>
                  No se han encontrado materiales de etiquetado con los criterios seleccionados.
                </td>
              </tr>
            ) : (
              labelsList.map((label) => (
                <GenericRow<LabelMaterial>
                  key={label.id}
                  item={label}
                  columns={COLUMNS_CONFIG}
                  actions={{
                    view: () => openModal('detail', label.id),
                    edit: () => openModal('edit', label.id), 
                    delete: () => openModal('delete', label.id),
                  }}
                  // Extra opcional para añadir el botón de clonar de forma limpia en el listado
                  extraActions={
                    <button 
                      type="button" 
                      title="Clonar para nueva añada"
                      className={styles.btnActionClone}
                      onClick={() => openModal('clone', label.id)}
                    >
                      🍷 Clonar
                    </button>
                  }
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
          currentPage={currentPage}
          onPageChange={handlePageChange}
          pageSize={10} 
        />
      </footer>

      {/* ORQUESTACIÓN DE MODALES DINÁMICOS MEDIANTE PORTAL */}
      {activeAction && (
        <Modal 
          onClose={closeModal} 
          title={getModalTitle()}
          showCloseButton={activeAction !== 'delete'} 
        >
          {activeAction === 'detail' && selectedLabel && (
            <LabelDetailView 
              labelData={selectedLabel}
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
            <LabelDeleteForm 
              labelData={selectedLabel}
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