import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StockTransferSchema, type StockTransferInput, type StockTransferOutput } from '../../models/stock.schema';
import { useDataTable } from '../../../shared/hooks';
import { LocationService } from '../../../locations/services/location.service';
import { type StockMovement } from '../../models/stock.schema';

import {
  FormInput,
  FormSelect,
  FormButton,
} from '../../../shared/components/formInputs';

import styles from './stock.transferForm.module.css';

export interface StockTransferFormProps {
  initialMovementData: StockMovement; // 🟢 Recibe el lote contextual directo de la fila
  onSubmit: (values: StockTransferOutput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const StockTransferForm: React.FC<StockTransferFormProps> = ({
  initialMovementData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  // 1. Único catálogo maestro necesario: Almacenes de destino
  const { data: locationsData, isLoading: isLoadingLocations } = useDataTable({
    key: 'locations-transfer-select',
    fetchFn: LocationService.getAll,
  });

  const locationOptions = (locationsData?.results || [])
    .filter(loc => loc.is_active)
    .map(loc => ({ id: loc.id, name: loc.name }));

  // 2. Orquestación del Formulario acoplado a Zod
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StockTransferInput, any, StockTransferOutput>({
    resolver: zodResolver(StockTransferSchema),
    defaultValues: {
      batch: initialMovementData.batch, // 🟢 Seteamos el ID del lote nativo directamente
      origin_location: initialMovementData.location, // 🟢 Ubicación de origen inicial
      destination_location: '' as any,
      quantity: 1,
      notes: '',
    },
  });

  // 3. Hidratación síncrona forzada para asegurar que Zod reciba los números en el envío
  useEffect(() => {
    if (initialMovementData) {
      setValue('batch', initialMovementData.batch);
      setValue('origin_location', initialMovementData.location);
    }
  }, [initialMovementData, setValue]);

  const handleFormSubmit = (data: StockTransferOutput) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={styles.formContainer} noValidate>
      
      <h3 className={styles.formTitle}>Transferencia de Material entre Ubicaciones</h3>
      <p className={styles.formDescription}>
        Mueva existencias físicas de forma controlada registrando las trazas correspondientes.
      </p>

      {/* 🟢 METACARD DE AUDITORÍA: Tarjeta visual de solo lectura con el contexto del lote */}
      <div className={styles.metaCard}>
        <div className={styles.metaRow}>
          <span>Material / Artículo:</span>
          <strong>{initialMovementData.product_name}</strong>
        </div>
        <div className={styles.metaRow}>
          <span>Lote de Proveedor:</span>
          <code className={styles.codeHighlight}>{initialMovementData.batch_number}</code>
        </div>
        <div className={styles.metaRow}>
          <span>Ubicación Actual:</span>
          <strong>{initialMovementData.location_name}</strong>
        </div>
        <div className={styles.metaRow}>
          <span>Existencias Disponibles:</span>
          <span className={styles.stockText}>{Number(initialMovementData.quantity).toFixed(2)} uds</span>
        </div>
      </div>

      <div className={styles.flexGrid}>
        
        {/* Selector de Destino */}
        <div className={styles.gridHalf}>
          <FormSelect
            label="Ubicación de Destino *"
            placeholder="Selecciona zona de destino..."
            register={register('destination_location')}
            options={locationOptions}
            error={errors.destination_location?.message}
            isLoading={isLoadingLocations}
          />
        </div>

        {/* Cantidad a Transferir */}
        <div className={styles.gridHalf}>
          <FormInput
            label="Cantidad a Mover *"
            type="number"
            placeholder="Ej: 500"
            register={register('quantity', { valueAsNumber: true })}
            error={errors.quantity?.message}
          />
        </div>

        {/* Justificación o Notas */}
        <div className={styles.gridFull}>
          <FormInput
            label="Notas de la Operación / Justificación"
            type="text"
            placeholder="Ej: Traslado por reorganización de estanterías..."
            register={register('notes')}
            error={errors.notes?.message}
          />
        </div>

      </div>

      {/* Botonera de Acciones */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar Traslado
        </FormButton>

        <FormButton type="submit" variant="primary" isLoading={isSubmitting} loadingText="Procesando Transferencia...">
          Confirmar Movimiento Interno
        </FormButton>
      </div>

    </form>
  );
};