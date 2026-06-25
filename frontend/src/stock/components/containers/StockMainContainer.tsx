// src/modules/inventory/pages/StockPage.tsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FormButton } from '../../../shared/components/formInputs';

// 📦 SUB-CONTENEDORES VISUALES SEPARADOS
import { StockHistoryTable } from './StockHistoryContainer';
import { StockAvailableTable } from './StockAvailableContainer';

// ⚙️ GESTIÓN DE ESTADO ASÍNCRONO (TANSTACK QUERY + SERVICES)
import { useDataTable, useDataMutation } from '../../../shared/hooks';
import { StockService } from '../../services/stock.service';
import { LocationService } from '../../../locations/services/location.service';

// 🖼️ COMPONENTES COMPARTIDOS DE INTERFAZ (UI)
import { useModal } from '../../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../../shared/components/modal/Modal'; 
import { Pagination } from '../../../shared/components/pagination/Pagination';

// 🎯 VALIDACIÓN DE CONTRATOS DE TIPOS (TYPESCRIPT)
import { type StockMovement, type AvailableBatch } from '../../models/stock.schema';

import styles from './StockMainContainer.module.css';
import { StockAdjustmentLoader, StockDetailLoader, StockTransferLoader } from '../loaders/StocksLoader';

export const StockMainContainer: React.FC = () => {
  // 🧭 PARTE 1: Enrutamiento local y control de ventanas modales
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeAction, activeId, openModal, closeModal } = useModal();
  
  // Determinamos de forma reactiva la pestaña activa leyendo la URL. Valor inicial: 'history'
  const activeTab = searchParams.get('tab') || 'history';

  // Manejador del cambio de vista. Obliga a la paginación a volver a 1 para sanear el render
  const handleTabChange = (tabName: string) => {
    setSearchParams({ tab: tabName, page: '1' });
  };

  // 📡 PARTE 2: Consumo inteligente de datos mediante endpoints especializados
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<any>({
    // La llave cambia condicionalmente para no mezclar ni pisar las cachés de datos entre pestañas
    key: activeTab === 'history' ? 'stock-movements-history' : 'stock-available-lots',
    fetchFn: (params) => {
      if (activeTab === 'inventory') {
        // Pestaña operativa de stock: Apunta al nuevo muelle de LOTES reales paginados
        return StockService.getAvailableStock(params);
      }
      // Pestaña Libro Diario: Mantiene el consumo del histórico lineal de trazas
      return StockService.getAll(params);
    },
  });

  // Catálogo maestro de bodegas para alimentar los combos de filtros superiores
  const { data: locationsFilterData } = useDataTable({
    key: 'locations-dashboard-filter',
    fetchFn: LocationService.getAll,
  });

  // Extracción polimórfica de los datos devueltos por Django REST Framework
  const itemsList = data?.results || [];
  const totalCount = data?.count || 0;

  // Formateo del catálogo de ubicaciones activas para el componente selector
  const locationFilterOptions = (locationsFilterData?.results || [])
    .filter(loc => loc.is_active)
    .map(loc => ({ id: String(loc.id), name: loc.name }));

  // 💾 PARTE 3: Mutaciones transaccionales con invalidación en paralelo
  const transferMutation = useDataMutation({
    mutationFn: StockService.transfer,
    // Cuando el usuario mueva mercancía, se limpian ambas cachés para actualizar la UI instantáneamente
    invalidateKeys: ['stock-movements-history', 'stock-available-lots'],
    onSuccess: () => closeModal(),
  });

  const adjustmentMutation = useDataMutation({
    mutationFn: StockService.adjustment,
    // Cuando el usuario declare una merma, se limpian ambas cachés para actualizar la UI instantáneamente
    invalidateKeys: ['stock-movements-history', 'stock-available-lots'],
    onSuccess: () => closeModal(),
  });

  if (isError) {
    return <div className={styles.errorContainer}>Error crítico al recuperar los datos de existencias.</div>;
  }

  return (
    <div className={styles.pageWrapper}>
      
      {/* 🎛️ SECCIÓN A: CONTROLADOR SUPERIOR DE PESTAÑAS (TABS) */}
      <div className={styles.tabBar}>
        <FormButton 
          variant={activeTab === 'history' ? 'primary' : 'secondary'} 
          onClick={() => handleTabChange('history')}
        >
          ⏱️ Libro Diario de Movimientos
        </FormButton>
        
        <FormButton 
          variant={activeTab === 'inventory' ? 'primary' : 'secondary'} 
          onClick={() => handleTabChange('inventory')}
        >
          📦 Existencias y Lotes Disponibles
        </FormButton>
      </div>

      {/* 📊 SECCIÓN B: TABLAS OPERATIVAS CON CONMUTACIÓN LIMPIA */}
      <div className={styles.containerContent}>
        {activeTab === 'history' && (
          <StockHistoryTable 
            movements={itemsList as StockMovement[]} 
            isLoading={isLoading} 
            filters={filters} 
            updateFilters={updateFilters} 
            locationOptions={locationFilterOptions} 
            onOpenDetail={(id) => openModal('detail', id)} 
          />
        )} 
        
        {activeTab === 'inventory' && (
          <StockAvailableTable 
            lots={itemsList as AvailableBatch[]} 
            isLoading={isLoading} 
            filters={filters} 
            updateFilters={updateFilters} 
            locationOptions={locationFilterOptions} 
            onOpenTransfer={(id) => openModal('transfer', id)} 
            onOpenAdjustment={(id) => openModal('adjustment', id)} 
          />
        )}
      </div>

      {/* 🧮 SECCIÓN C: CONTROL DE PAGINACIÓN COMPARTIDO */}
      <footer className={styles.footerSection}>
        <Pagination
          count={totalCount}
          currentPage={Number(filters.page) || 1}
          onPageChange={(newPage) => updateFilters({ page: newPage })}
          pageSize={10} 
        />
      </footer>

      {/* 🪟 SECCIÓN D: PORTAL DE MODALES CON LOADERS BAJO DEMANDA */}
      {activeAction && activeId && (
        <Modal 
          onClose={closeModal} 
          title={
            activeAction === 'transfer' 
              ? 'Registrar Traslado' 
              : activeAction === 'adjustment' 
                ? 'Declarar Merma' 
                : 'Ficha Técnica de Auditoría'
          }
        >
          {activeAction === 'detail' && (
            <StockDetailLoader id={Number(activeId)} onBack={closeModal} />
          )}
          
          {activeAction === 'transfer' && (
            <StockTransferLoader 
              id={Number(activeId)} 
              onSubmit={(values) => transferMutation.mutate(values)} 
              onCancel={closeModal} 
              isSubmitting={transferMutation.isPending} 
            />
          )}
          
          {activeAction === 'adjustment' && (
            <StockAdjustmentLoader 
              id={Number(activeId)} 
              onSubmit={(values) => adjustmentMutation.mutate(values)} 
              onCancel={closeModal} 
              isSubmitting={adjustmentMutation.isPending} 
            />
          )}
        </Modal>
      )}

    </div>
  );
};

