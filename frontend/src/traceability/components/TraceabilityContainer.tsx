// src/modules/traceability/components/containers/TraceabilityContainer.tsx
import React from 'react';
import { FileDown } from 'lucide-react';

import { useDataTable } from '../../shared/hooks';
import { FilterInput } from '../../shared/components/filters'; 
import { GenericTable, GenericRow } from '../../shared/components/table';
import { Pagination } from '../../shared/components/pagination/Pagination';
import { TraceabilityService } from '../services/traceability.services';

import type { 
  LotTraceability, 
  LotTraceabilityPaginationResponse 
} from '../models/traceability.schema'; 

import { GenericDetailView } from '../../shared/components/forms/forms.detail';
import { useModal } from '../../shared/components/modal/context/ModalContext'; 
import { Modal } from '../../shared/components/modal/Modal'; 

import { 
  TRACEABILITY_COLUMNS_CONFIG, 
  getTraceabilityDetailFields 
} from '../constants/traceability.constants';
import styles from '../../supplier/components/Supplier.container.module.css';

export const TraceabilityContainer: React.FC = () => {
  const { activeAction, activeId, openModal, closeModal } = useModal();

  // 1. Cargamos el listado inalterable de expedientes de trazabilidad
  const { data, isLoading, isError, filters, updateFilters } = useDataTable<LotTraceabilityPaginationResponse>({
    key: 'traceability-records',
    fetchFn: TraceabilityService.getAll,
  });

  const recordsList = data?.results || [];
  const totalCount = data?.count || 0;
  const selectedRecord = recordsList.find(r => r.id === Number(activeId));

  const tableHeaders = [...TRACEABILITY_COLUMNS_CONFIG.map(col => col.header), 'Acciones'];

  // Función pura para disparar la descarga de PDF
  const handleDownloadPdf = async (lotNumber: string) => {
    try {
      await TraceabilityService.downloadPdf(lotNumber);
    } catch (err) {
      alert('Error al descargar el PDF oficial de trazabilidad.');
    }
  };

  if (isError) {
    return <div className={styles.errorContainer}>Error al cargar los expedientes de trazabilidad.</div>;
  }

  const getModalTitle = () => {
    if (activeAction === 'detail') return 'Expediente Oficial de Trazabilidad e Integridad';
    return undefined;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div className={styles.topToolbar}>
        <h1 className={styles.pageTitle}>Calidad y Trazabilidad de Lotes</h1>
      </div>

      {/* SECCIÓN DE FILTROS DE NAVEGACIÓN (Sincronizado vía useSearchParams / useDataTable) */}
      <div className={styles.filtersSection}>
        <FilterInput
          label="Buscar Expediente por Lote o Vino"
          name="search"
          value={filters.search}
          onChange={updateFilters}
          placeholder="Escribe el número de lote (ej: L26-001) o vino..."
        />
      </div>

      {/* SECCIÓN DE TABLA */}
      <div className={styles.tableSection}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}>Verificando firmas de integridad SHA-256...</div>
        ) : (
          <GenericTable headers={tableHeaders}>
            {recordsList.length === 0 ? (
              <tr>
                <td colSpan={tableHeaders.length} className={styles.emptyState}>
                  No se registran expedientes de trazabilidad que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              recordsList.map((record) => {
                const lotNum = record.content?.order_details?.lot_number || '';
                return (
                  <GenericRow<LotTraceability>
                    key={record.id}
                    item={record}
                    columns={TRACEABILITY_COLUMNS_CONFIG}
                    actions={{
                      view: () => openModal('detail', record.id),
                      
                      // 🟢 ACCIÓN DIRECTA SIN USESTATE LOCAL
                      custom: [
                        {
                          label: 'Descargar Informe PDF',
                          icon: FileDown,
                          onClick: () => handleDownloadPdf(lotNum),
                        }
                      ]
                    }}
                  />
                );
              })
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

      {/* PORTAL TRANSACCIONAL DE MODALES (Gestión delegada a useModal / useSearchParams) */}
      {activeAction && (
        <Modal onClose={closeModal} title={getModalTitle()}>
          
          {activeAction === 'detail' && selectedRecord && (() => {
  // 🟢 Imprimimos por consola la estructura exacta recibida desde la API
            console.log("🔍 ESTRUCTURA REAL DE SELECTED_RECORD:", selectedRecord);

            return (
              <GenericDetailView<LotTraceability>
                data={selectedRecord}
                badgeLabel="Estado de Integridad:"
                badgeValue={selectedRecord.integrity_status?.valid ? 'Íntegro' : 'Alterado'}
                titleLabel="Lote Auditado:"
                titleValue={selectedRecord.content?.order_details?.lot_number || 'N/A'}
                codeLabel="Firma Digital SHA-256"
                codeValue={selectedRecord.integrity_hash.substring(0, 16) + '...'}
                isActive={selectedRecord.integrity_status?.valid}
                fields={getTraceabilityDetailFields(selectedRecord)}
                onBack={closeModal}
              />
            );
          })()}
        </Modal>
      )}
    </div>
  );
};