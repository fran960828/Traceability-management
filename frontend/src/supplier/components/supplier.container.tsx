// src/modules/suppliers/pages/SuppliersPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query'; // 🔄 CAMBIO 1: Importación de useQuery
import { useDataTable } from '../../shared/hooks/useDataTable';
import { FilterInput } from '../../shared/components/filters/FilterInput';
import { FilterSelect } from '../../shared/components/filters/FilterSelect'; // 🔄 CAMBIO 2: Importación de FilterSelect en vez de FilterDateRange
import { GenericTable } from '../../shared/components/table/GenericTable';
import { GenericRow } from '../../shared/components/table/GenericRow';
import { Pagination } from '../../shared/components/pagination/Pagination';
import { CategoryService, SupplierService } from '../services';
// 🔄 CAMBIO 3: Ajustada la ruta de los modelos/tipos creados en el paso 1
import type { Supplier, SupplierPaginationResponse } from '../models'; 
import styles from './SuppliersPage.module.css';

// 1. Definimos la configuración de las columnas que queremos exponer
const COLUMNS_CONFIG = [
  { header: 'Código', key: 'supplier_code' as const },
  { header: 'Nombre', key: 'name' as const },
  { header: 'NIF/CIF', key: 'tax_id' as const },
  { header: 'Categoría', key: 'category_name' as const }, // 🔄 CAMBIO 4: Añadida columna categoría (vía category_name de Django)
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

export const SuppliersPage: React.FC = () => {
  // 🔄 CAMBIO 5: Llamada al maestro de categorías para rellenar el dropdown
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories-master'],
    queryFn: CategoryService.getCategories,
    staleTime: 30 * 60 * 1000, // Datos frescos en caché durante 30 minutos
  });

  // 2. Consumimos tu hook genérico
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<SupplierPaginationResponse>({
    key: 'suppliers',
    fetchFn: SupplierService.getAll,
  });

  // 3. Extraemos los datos numéricos y de paginación de forma segura
  const suppliersList = data?.results || [];
  const totalCount = data?.count || 0;
  // 🔄 CAMBIO 6: Aseguramos que el valor mapeado al select sea string, number o undefined, nunca un string vacío distorsionado
  const currentCategoryValue = filters.category ? String(filters.category) : undefined;
  const currentPage = Number(filters.page) || 1;

  // 4. Extraemos las cabeceras para la GenericTable
  const tableHeaders = COLUMNS_CONFIG.map(col => col.header);

  const handlePageChange = (newPage: number) => {
    updateFilters({ page: newPage });
  };

  if (isError) {
    return <div className={styles.errorContainer}>Error al cargar los proveedores de la bodega.</div>;
  }

  return (
    <div className={styles.pageWrapper}>
      {/* SECCIÓN DE FILTROS */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Nombre"
          name="name"
          value={filters.name}
          onChange={updateFilters}
        />
        <FilterInput
          label="NIF/CIF"
          name="tax_id"
          value={filters.tax_id}
          onChange={updateFilters}
        />
        {/* 🔄 CAMBIO 7: Sustitución de FilterDateRange por tu FilterSelect genérico */}
        <FilterSelect
          label="Categoría"
          name="category"
          value={currentCategoryValue}
          options={categories}
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
                <td colSpan={tableHeaders.length + 1} className={styles.emptyState}>
                  No se han encontrado proveedores con los criterios seleccionados.
                </td>
              </tr>
            ) : (
              suppliersList.map((supplier) => (
                <GenericRow<Supplier>
                  key={supplier.id}
                  item={supplier}
                  columns={COLUMNS_CONFIG}
                  actions={{
                    edit: () => {}, 
                    delete: () => {},
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
    </div>
  );
};