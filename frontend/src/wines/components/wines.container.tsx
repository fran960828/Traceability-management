// src/modules/wines/components/containers/WineContainer.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query'; 
import { useDataMutation, useDataTable } from '../../shared/hooks';
import { FilterInput, FilterSelect } from '../../shared/components/filters'; 
import { GenericTable, GenericRow } from '../../shared/components/table';
import { Pagination } from '../../shared/components/pagination/Pagination';
import { WineService } from '../services/wines.service';
import { 
  type WineMaterial, 
  type WinePaginationResponse, 
  type WineFormValues, 
  WINE_TYPES 
} from '../models/wines.schema'; 

import { WineForm } from './forms/wines.create'; // Tu formulario adaptado a strings
import { GenericDeleteForm } from '../../shared/components/forms/forms.delete';
import { GenericDetailView } from '../../shared/components/forms/forms.detail';
import { FormButton } from '../../shared/components/formInputs/FormButton';
import { useModal } from '../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../shared/components/modal/Modal'; 

// Metadata y configuraciones estáticas
import { WINE_COLUMNS_CONFIG, WINE_DELETE_CONFIG, getWineDetailFields } from '../constants/wines.constants';
import styles from '../../supplier/components/Supplier.container.module.css';

export const WineContainer: React.FC = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // 1. Sincronización analítica de filtros y Query params con Django
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<WinePaginationResponse>({
    key: 'wines-inventory',
    fetchFn: WineService.getAll,
  });

  const winesList = data?.results || [];
  const totalCount = data?.count || 0;
  const selectedWine = winesList.find(w => w.id === Number(activeId));
  const tableHeaders = [...WINE_COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  // Selectores de filtrado dinámicos para la cabecera
  const wineTypeOptions = Object.values(WINE_TYPES).map(type => ({ id: type, name: type }));
  const uniqueVintages = Array.from(new Set(winesList.map(w => String(w.vintage))))
    .sort()
    .map(v => ({ id: v, name: v }));

  // Query asíncrona para recuperar los datos pre-limpiados del CloneMixin
  const { data: clonePrefillData, isLoading: isLoadingClonePrefill } = useQuery({
    queryKey: ['wine-clone-prefill', activeId],
    queryFn: () => WineService.clone(Number(activeId)),
    enabled: activeAction === 'clone' && !!activeId,
    staleTime: 0, 
  });

  // 2. Operaciones de Mutación Asíncronas (TanStack Query)
  const createMutation = useDataMutation({
    mutationFn: WineService.create,
    invalidateKeys: ['wines-inventory'],
    onSuccess: () => closeModal(),
  });

  const updateMutation = useDataMutation({
    mutationFn: ({ id, values }: { id: number; values: any }) => WineService.update(id, values),
    invalidateKeys: ['wines-inventory'],
    onSuccess: () => closeModal(),
  });

  const deleteMutation = useDataMutation({
    mutationFn: WineService.delete,
    invalidateKeys: ['wines-inventory'],
    onSuccess: () => closeModal(),
  });

  // ====================================================================
  // 🧼 SANITIZACIÓN OPERATIVA ANTES DE PEGAR AL SERIALIZADOR DE DJANGO
  // ====================================================================
  const handleFormSubmit = (formValues: WineFormValues) => {
    const apiPayload = {
      ...formValues,
      // Convertimos el año que viene del input numérico
      vintage: Number(formValues.vintage),
      // Mapeamos las llaves foráneas del escandallo a enteros puros o null si viajan vacías
      default_container: Number(formValues.default_container),
      default_cork: formValues.default_cork ? Number(formValues.default_cork) : null,
      default_front_label: formValues.default_front_label ? Number(formValues.default_front_label) : null,
      default_back_label: formValues.default_back_label ? Number(formValues.default_back_label) : null,
      default_dop_seal: formValues.default_dop_seal ? Number(formValues.default_dop_seal) : null,
      default_capsule: formValues.default_capsule ? Number(formValues.default_capsule) : null,
    };

    if (activeAction === 'edit' && selectedWine) {
      updateMutation.mutate({ id: selectedWine.id, values: apiPayload });
    } else {
      createMutation.mutate(apiPayload as any);
    }
  };

  // Adapta los datos de lectura al formato de strings para que se hidro-rellene la UI sin warnings
  const getFormInitialData = (): any => {
    if (activeAction === 'edit' && selectedWine) {
      return {
        ...selectedWine,
        default_container: String(selectedWine.default_container),
        default_cork: selectedWine.default_cork ? String(selectedWine.default_cork) : '',
        default_front_label: selectedWine.default_front_label ? String(selectedWine.default_front_label) : '',
        default_back_label: selectedWine.default_back_label ? String(selectedWine.default_back_label) : '',
        default_dop_seal: selectedWine.default_dop_seal ? String(selectedWine.default_dop_seal) : '',
        default_capsule: selectedWine.default_capsule ? String(selectedWine.default_capsule) : '',
      };
    }
    if (activeAction === 'clone' && clonePrefillData) {
      return {
        ...clonePrefillData,
        default_container: clonePrefillData.default_container ? String(clonePrefillData.default_container) : '',
        default_cork: clonePrefillData.default_cork ? String(clonePrefillData.default_cork) : '',
        default_front_label: clonePrefillData.default_front_label ? String(clonePrefillData.default_front_label) : '',
        default_back_label: clonePrefillData.default_back_label ? String(clonePrefillData.default_back_label) : '',
        default_dop_seal: clonePrefillData.default_dop_seal ? String(clonePrefillData.default_dop_seal) : '',
        default_capsule: clonePrefillData.default_capsule ? String(clonePrefillData.default_capsule) : '',
      };
    }
    return undefined;
  };

  if (isError) {
    return <div className={styles.errorContainer}>Error al cargar el catálogo maestro de vinos.</div>;
  }

  const getModalTitle = () => {
    if (activeAction === 'create') return 'Registrar Vino';
    if (activeAction === 'edit') return 'Modificar Ficha Técnica';
    if (activeAction === 'clone') return 'Clonación Inteligente de Añada';
    if (activeAction === 'delete') return 'Advertencia de Eliminación';
    if (activeAction === 'detail') return 'Ficha Técnica del Vino';
    return undefined;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div className={styles.topToolbar}>
        <h1 className={styles.pageTitle}>Fichas Técnicas de Vinos</h1>
        <FormButton variant="primary" onClick={() => openModal('create')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 18, height: 18 }}>
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Registrar Vino
        </FormButton>
      </div>

      {/* FILTROS INTEGRADOS */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Buscar Vino"
          name="search"
          value={filters.search}
          onChange={updateFilters}
          placeholder="Nombre, código o D.O...."
        />
        <FilterSelect
          label="Tipo"
          name="wine_type"
          value={filters.wine_type}
          options={wineTypeOptions}
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

      {/* TABLA DE INVENTARIO MAESTRO */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Cargando registros del catálogo de vinos...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {winesList.length === 0 ? (
              <tr><td colSpan={tableHeaders.length} className={styles.emptyState}>No se han encontrado fichas técnicas de vino registradas.</td></tr>
            ) : (
              winesList.map((wine) => (
                <GenericRow<WineMaterial>
                  key={wine.id}
                  item={wine}
                  columns={WINE_COLUMNS_CONFIG}
                  actions={{
                    view: () => openModal('detail', wine.id),
                    edit: () => openModal('edit', wine.id), 
                    delete: () => openModal('delete', wine.id),
                    clone: () => openModal('clone', wine.id)
                  }}
                />
              ))
            )}
          </GenericTable>
        )}
      </div>

      {/* FOOTER / PAGINACIÓN */}
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
          {activeAction === 'detail' && selectedWine && (
            <GenericDetailView<WineMaterial>
              data={selectedWine}
              badgeLabel="Crianza:"
              badgeValue={selectedWine.aging_category_display}
              titleLabel="Vino:"
              titleValue={selectedWine.name}
              codeLabel="Código único de trazabilidad"
              codeValue={selectedWine.internal_code}
              isActive={selectedWine.is_active}
              fields={getWineDetailFields(selectedWine)}
              onBack={closeModal}
              onEditClick={(w) => openModal('edit', w.id)}
              onDeleteClick={(w) => openModal('delete', w.id)}
            />
          )}

          {(activeAction === 'create' || activeAction === 'edit' || activeAction === 'clone') && (
            isLoadingClonePrefill ? (
              <div className={styles.loadingPlaceholder}>Preparando borrador de clonación de añada...</div>
            ) : (
              <WineForm 
                productInitialData={getFormInitialData()}
                onSubmit={handleFormSubmit}
                onCancel={closeModal}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
                activeAction={activeAction as 'create' | 'edit' | 'clone'}
              />
            )
          )}

          {activeAction === 'delete' && selectedWine && (
            <GenericDeleteForm<number>
              id={selectedWine.id}
              name={selectedWine.name}
              subtitle={`${selectedWine.vintage} - ${selectedWine.appellation_name}`}
              codeValue={selectedWine.internal_code}
              {...WINE_DELETE_CONFIG}
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