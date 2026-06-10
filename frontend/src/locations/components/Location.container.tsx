// src/modules/inventory/pages/LocationsPage.tsx
import React from 'react';
import { useDataMutation, useDataTable } from '../../shared/hooks';
import { FilterInput } from '../../shared/components/filters'; 
import { GenericTable, GenericRow } from '../../shared/components/table';
import { Pagination } from '../../shared/components/pagination/Pagination';
import { LocationService } from '../services/location.service';
import type { Location, LocationPaginationResponse, LocationFormValues } from '../models/location.schema'; 

import { GenericDeleteForm } from '../../shared/components/forms/forms.delete';
import { GenericDetailView } from '../../shared/components/forms/forms.detail';
import { LocationForm } from '../components/forms/location.create';
import { FormButton } from '../../shared/components/formInputs/FormButton';
import { useModal } from '../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../shared/components/modal/Modal'; 

import { 
  LOCATION_COLUMNS_CONFIG, 
  LOCATION_DELETE_CONFIG, 
  getLocationDetailFields 
} from '../constants/location.constants';
import styles from '../../supplier/components/Supplier.container.module.css'; // Reutilización de la maquetación base

export const LocationsContainer: React.FC = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // 1. Sincronización analítica de filtros y Query params con Django
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<LocationPaginationResponse>({
    key: 'locations',
    fetchFn: LocationService.getAll,
  });

  const locationsList = data?.results || [];
  const totalCount = data?.count || 0;
  const selectedLocation = locationsList.find(loc => loc.id === Number(activeId));
  
  const tableHeaders = [...LOCATION_COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  // 2. Operaciones de Red Inmutables (TanStack Query Mutations)
  const createMutation = useDataMutation({
    mutationFn: LocationService.create,
    invalidateKeys: ['locations'],
    onSuccess: () => closeModal(),
  });

  const updateMutation = useDataMutation({
    mutationFn: ({ id, values }: { id: number; values: LocationFormValues }) => LocationService.update(id, values),
    invalidateKeys: ['locations'],
    onSuccess: () => closeModal(),
  });

  const deleteMutation = useDataMutation({
    mutationFn: LocationService.delete,
    invalidateKeys: ['locations'],
    onSuccess: () => closeModal(),
  });

  const handleFormSubmit = (values: LocationFormValues) => {
    if (activeAction === 'edit' && selectedLocation) {
      updateMutation.mutate({ id: selectedLocation.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isError) {
    return <div className={styles.errorContainer}>Error al cargar las zonas de almacenamiento físico de la bodega.</div>;
  }

  const getModalTitle = () => {
    if (activeAction === 'create') return 'Establecer Nueva Ubicación';
    if (activeAction === 'edit') return 'Modificar Parámetros de Ubicación';
    if (activeAction === 'delete') return 'Advertencia de Seguridad de Stock';
    if (activeAction === 'detail') return 'Ficha Técnica de la Localización';
    return undefined;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div className={styles.topToolbar}>
        <h1 className={styles.pageTitle}>Ubicaciones Físicas de Almacenamiento</h1>
        <FormButton variant="primary" onClick={() => openModal('create')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 18, height: 18 }}>
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Registrar Ubicación
        </FormButton>
      </div>

      {/* SECCIÓN DE FILTROS LIMPIA */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Buscar Ubicación"
          name="search"
          value={filters.search}
          onChange={updateFilters}
          placeholder='Introduce código o descripción...'
        />
      </div>

      {/* SECCIÓN DE TABLA MAESTRA */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Cargando registros estructurales de stock...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {locationsList.length === 0 ? (
              <tr><td colSpan={tableHeaders.length} className={styles.emptyState}>No se han encontrado zonas de almacenamiento registradas en el sistema.</td></tr>
            ) : (
              locationsList.map((location) => (
                <GenericRow<Location>
                  key={location.id}
                  item={location}
                  columns={LOCATION_COLUMNS_CONFIG}
                  actions={{
                    view: () => openModal('detail', location.id),
                    edit: () => openModal('edit', location.id), 
                    delete: () => openModal('delete', location.id),
                  }}
                />
              ))
            )}
          </GenericTable>
        )}
      </div>

      {/* PIE DE PÁGINA Y CONTROL DE RANGO */}
      <footer className={styles.footerSection}>
        <Pagination
          count={totalCount}
          currentPage={Number(filters.page) || 1}
          onPageChange={(newPage) => updateFilters({ page: newPage })}
          pageSize={10} 
        />
      </footer>

      {/* CONTROLADOR SELECTIVO DE PORTALES (MODALES) */}
      {activeAction && (
        <Modal onClose={closeModal} title={getModalTitle()} showCloseButton={activeAction !== 'delete'}>
          
          {/* Vista de Detalle Estructural */}
          {activeAction === 'detail' && selectedLocation && (
            <GenericDetailView<Location>
              data={selectedLocation}
              badgeLabel="Estado de Uso:"
              badgeValue={selectedLocation.is_active ? 'DISPONIBLE' : 'CLAUSURADO'}
              titleLabel="Ubicación:"
              titleValue={selectedLocation.name}
              codeLabel="Identificador de Trazabilidad"
              codeValue={selectedLocation.name}
              isActive={selectedLocation.is_active}
              fields={getLocationDetailFields(selectedLocation)}
              onBack={closeModal}
              onEditClick={(loc) => openModal('edit', loc.id)}
              onDeleteClick={(loc) => openModal('delete', loc.id)}
            />
          )}

          {/* Formulario Reactivo (Alta / Modificación) */}
          {(activeAction === 'create' || activeAction === 'edit') && (
            <LocationForm 
              locationInitialData={selectedLocation}
              onSubmit={handleFormSubmit}
              onCancel={closeModal}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          )}

          {/* Formulario Crítico de Borrado */}
          {activeAction === 'delete' && selectedLocation && (
            <GenericDeleteForm<number>
              id={selectedLocation.id}
              name={selectedLocation.name}
              subtitle={selectedLocation.description || 'Sin descripción descriptiva.'}
              codeValue={selectedLocation.name}
              {...LOCATION_DELETE_CONFIG}
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