import { GenericDetailView } from "../../../shared/components/forms/forms.detail";
import { useDataTable } from "../../../shared/hooks";
import { getStockMovementDetailFields } from "../../constants/stock.constants";
import type { AvailableBatch, StockMovement } from "../../models";
import { StockService } from "../../services/stock.service";
import { StockAdjustmentForm, StockTransferForm } from "../forms";
import styles from '../containers/StockMainContainer.module.css';

export const StockDetailLoader: React.FC<{ id: number; onBack: () => void }> = ({ id, onBack }) => {
  const { data: movement, isLoading, isError } = useDataTable<StockMovement>({
    key: `movement-detail-fetch-${id}`,
    fetchFn: () => StockService.getById(id),
  });

  if (isLoading) return <div className={styles.loadingPlaceholder}>Cargando auditoría técnica...</div>;
  if (isError || !movement) return <div>Error al recuperar los detalles del movimiento.</div>;

  return (
    <GenericDetailView<StockMovement> 
      data={movement} 
      badgeLabel="Tipo:" 
      badgeValue={movement.movement_type_display} 
      titleLabel="Operación:" 
      titleValue={String(movement.id)} 
      codeLabel="Lote" 
      codeValue={movement.batch_number} 
      isActive={Number(movement.quantity) !== 0} 
      fields={getStockMovementDetailFields(movement)} 
      onBack={onBack} 
    />
  );
};

/**
 * 🟢 CARGADOR ASÍNCRONO PARA FORMULARIO DE TRASLADOS
 * Realiza una transformación controlada y segura del contrato de datos.
 */
export const StockTransferLoader: React.FC<{ 
  id: number; 
  onSubmit: (values: any) => void; 
  onCancel: () => void;
  isSubmitting: boolean;
}> = ({ id, onSubmit, onCancel, isSubmitting }) => {
  
  // Consultamos el lote mediante su ID para saber sus datos base reales en caliente
  const { data: lot, isLoading, isError } = useDataTable<AvailableBatch>({
    key: `lot-transfer-hydrate-${id}`,
    fetchFn: () => StockService.getAvailableStock({ search: String(id) }).then(res => res.results[0]),
  });

  if (isLoading) return <div className={styles.loadingPlaceholder}>Preparando entorno de traslado...</div>;
  if (isError || !lot) return <div>Error crítico al hidratar el lote seleccionado.</div>;

  // Adaptamos el Lote al formato esperado por el formulario heredado
  const adaptedMovement = {
    id: lot.id,
    batch: lot.id,
    batch_number: lot.batch_number,
    product_name: lot.product_name,
    location: lot.location || 0,
    location_name: lot.location_name,
    quantity: lot.current_stock_cache,
  } as any;

  return (
    <StockTransferForm 
      initialMovementData={adaptedMovement} 
      onSubmit={onSubmit} 
      onCancel={onCancel} 
      isSubmitting={isSubmitting} 
    />
  );
};

/**
 * 🟢 CARGADOR ASÍNCRONO PARA FORMULARIO DE MERMAS
 */
export const StockAdjustmentLoader: React.FC<{ 
  id: number; 
  onSubmit: (values: any) => void; 
  onCancel: () => void;
  isSubmitting: boolean;
}> = ({ id, onSubmit, onCancel, isSubmitting }) => {

  const { data: lot, isLoading, isError } = useDataTable<AvailableBatch>({
    key: `lot-adjustment-hydrate-${id}`,
    fetchFn: () => StockService.getAvailableStock({ search: String(id) }).then(res => res.results[0]),
  });

  if (isLoading) return <div className={styles.loadingPlaceholder}>Aperturando pasarela de mermas...</div>;
  if (isError || !lot) return <div>Error crítico al hidratar el lote seleccionado.</div>;

  const adaptedMovement = {
    id: lot.id,
    batch: lot.id,
    batch_number: lot.batch_number,
    product_name: lot.product_name,
    location: lot.location || 0,
    location_name: lot.location_name,
    quantity: lot.current_stock_cache,
  } as any;

  return (
    <StockAdjustmentForm 
      initialMovementData={adaptedMovement} 
      onSubmit={onSubmit} 
      onCancel={onCancel} 
      isSubmitting={isSubmitting} 
    />
  );
};