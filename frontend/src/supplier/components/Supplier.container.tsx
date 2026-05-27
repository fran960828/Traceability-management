// src/modules/suppliers/pages/SuppliersPage.tsx
import React from 'react';
import { useQuery} from '@tanstack/react-query'; 
import { useDataMutation, useDataTable } from '../../shared/hooks';
import { FilterInput, FilterSelect } from '../../shared/components/filters'; 
import { GenericTable, GenericRow } from '../../shared/components/table';
import { Pagination } from '../../shared/components/pagination/Pagination';
import { CategoryService, SupplierService } from '../services';
import type { Supplier, SupplierPaginationResponse, SupplierFormValues } from '../models'; 

import { GenericDeleteForm } from '../../shared/components/forms/forms.delete';
import { SupplierForm} from './forms';
import { FormButton } from '../../shared/components/formInputs/FormButton';

// 🔄 MODIFICACIÓN 1: Consumo del Modal global del proyecto y su contexto
import { useModal } from '../../shared/components/modal/context/ModalContext'; // Ajusta la ruta a tu archivo de contexto
import { Modal } from '../../shared/components/modal/Modal'; // Tu componente modal basado en portales

import styles from './Supplier.container.module.css';
import { GenericDetailView } from '../../shared/components/forms/forms.detail';

const COLUMNS_CONFIG = [
  { header: 'Código', key: 'supplier_code' as const },
  { header: 'Nombre', key: 'name' as const },
  { header: 'NIF/CIF', key: 'tax_id' as const },
  { header: 'Categoría', key: 'category_name' as const }, 
  { header: 'Email Pedidos', key: 'email_pedidos' as const },
  { header: 'Teléfono', key: 'phone' as const },
  { header: 'Plazo (Días)', key: 'lead_time' as const },
  { 
    header: 'Estado', 
    key: 'is_active' as const,
    render: (item: Supplier) => (
      <span className={`${styles.badge} ${item.is_active ? styles.active : styles.inactive}`}>
        {item.is_active ? 'Activo' : 'Inactivo'}
      </span>
    )
  },
];

export const SuppliersContainer: React.FC = () => {

  // 🔄 MODIFICACIÓN 2: Extraer el control de modales de la URL por medio del hook global
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // Maestros de categorías
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories-master'],
    queryFn: CategoryService.getCategories,
    staleTime: 30 * 60 * 1000, 
  });

  const categoriesOptions = categories?.results || [];

  // Hook genérico de tabla
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<SupplierPaginationResponse>({
    key: 'suppliers',
    fetchFn: SupplierService.getAll,
  });

  const suppliersList = data?.results || [];
  const totalCount = data?.count || 0;
  const currentCategoryValue = filters.category ? String(filters.category) : undefined;
  const currentPage = Number(filters.page) || 1;

  const tableHeaders = [...COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  const handlePageChange = (newPage: number) => {
    updateFilters({ page: newPage });
  };

  // 🔄 MODIFICACIÓN 3: Obtener los datos del proveedor seleccionado basándonos en el activeId de la URL
  const selectedSupplier = suppliersList.find(
    (sup) => sup.id === Number(activeId)
  );

 // 1. Mutación para Crear
const createMutation = useDataMutation({
  mutationFn: SupplierService.create,
  invalidateKeys: ['suppliers'], // Tu hook se encarga de invalidar automáticamente
  onSuccess: () => closeModal(), // Limpia la URL y cierra el modal al terminar
});

// 2. Mutación para Editar
const updateMutation = useDataMutation({
  mutationFn: ({ id, values }: { id: number; values: SupplierFormValues }) => 
    SupplierService.update(id, values),
  invalidateKeys: ['suppliers'],
  onSuccess: () => closeModal(),
});

// 3. Mutación para Eliminar
const deleteMutation = useDataMutation({
  mutationFn: SupplierService.delete,
  invalidateKeys: ['suppliers'],
  onSuccess: () => closeModal(),
});

// El manejador del submit se simplifica en lectura (usando .isPending igual que antes)
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

  // Determinar el título semántico del modal según la acción activa en la URL
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
        {/* 🔄 MODIFICACIÓN 4: Botón adaptado al openModal del contexto global */}
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
          value={currentCategoryValue}
          options={categoriesOptions}
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
              <tr>
                <td colSpan={tableHeaders.length} className={styles.emptyState}>
                  No se han encontrado proveedores con los criterios seleccionados.
                </td>
              </tr>
            ) : (
              suppliersList.map((supplier) => (
                <GenericRow<Supplier>
                  key={supplier.id}
                  item={supplier}
                  columns={COLUMNS_CONFIG}
                  // 🔄 MODIFICACIÓN 5: Acciones de fila conectadas al openModal de la URL pasándole el id
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
          currentPage={currentPage}
          onPageChange={handlePageChange}
          pageSize={10} 
        />
      </footer>

      {/* 🔄 MODIFICACIÓN 6: Renderizado del nuevo componente Modal conectado al contexto de la URL */}
      {activeAction && (
        <Modal 
          onClose={closeModal} 
          title={getModalTitle()}
          showCloseButton={activeAction !== 'delete'} // Ocultamos la X en el borrado para forzar confirmación
        >
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
                fields={[
                  { label: 'NIF / CIF', value: selectedSupplier.tax_id },
                  { label: 'Plazo de Entrega Garantizado', value: `${selectedSupplier.lead_time} ${selectedSupplier.lead_time === 1 ? 'día' : 'días'}` },
                  { label: 'Teléfono de Contacto', value: selectedSupplier.phone },
                  { label: 'Email de Pedidos', value: selectedSupplier.email_pedidos },
                  { label: 'Dirección de la Sede', value: selectedSupplier.address, fullWidth: true },
                  { 
                    label: 'Información de Registro', 
                    value: `Dado de alta el ${new Date(selectedSupplier.created_at).toLocaleDateString('es-ES')} (ID Interno: ${selectedSupplier.id})`, 
                    fullWidth: true, 
                    isMeta: true 
                  },
                ]}
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
              title="¿Eliminar Proveedor?"
              name={selectedSupplier.name}
              subtitle={selectedSupplier.tax_id}
              codeLabel="código"
              codeValue={selectedSupplier.supplier_code}
              impactMessage="Los pedidos de compra históricos asociados a este proveedor podrían verse afectados o quedar congelados."
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