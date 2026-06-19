import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StockAdjustmentSchema, type StockAdjustmentInput, type StockAdjustmentOutput } from '../../models/stock.schema';
import { type StockMovement } from '../../models/stock.schema';

import {
  FormInput,
  FormButton,
} from '../../../shared/components/formInputs';

import styles from './stock.adjustmentForm.module.css';

export interface StockAdjustmentFormProps {
  initialMovementData: StockMovement; // 🟢 Recibe el lote contextual directo de la fila
  onSubmit: (values: StockAdjustmentOutput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const StockAdjustmentForm: React.FC<StockAdjustmentFormProps> = ({
  initialMovementData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {

  // 1. Orquestación del Formulario acoplado directamente al validador de Zod
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StockAdjustmentInput, any, StockAdjustmentOutput>({
    resolver: zodResolver(StockAdjustmentSchema),
    defaultValues: {
      batch: initialMovementData.batch,       // 🟢 Hidratación inmediata del lote
      location: initialMovementData.location, // 🟢 Hidratación inmediata del almacén actual
      quantity: '' as any,
      notes: '',
    },
  });

  // 2. Sincronización analítica forzada en el ciclo de montaje
  useEffect(() => {
    if (initialMovementData) {
      setValue('batch', initialMovementData.batch);
      setValue('location', initialMovementData.location);
    }
  }, [initialMovementData, setValue]);

  const handleFormSubmit = (data: StockAdjustmentOutput) => {
    onSubmit(data);
  };

  return (
    <form 
      onSubmit={handleSubmit(
        (data) => handleFormSubmit(data),
        (err) => console.log("🚨 CAMPOS CON ERROR EN AJUSTE:", Object.keys(err))
      )} 
      className={styles.formContainer} 
      noValidate
    >
      
      <h3 className={styles.formTitle}>Ajuste de Inventario y Mermas</h3>
      <p className={styles.formDescription}>
        Declare mermas, roturas o desfases físicos detectados en las auditorías de almacén. Toda retirada requiere justificación explícita.
      </p>

      {/* 🟢 METACARD DE AUDITORÍA: Panel informativo estático de alta fidelidad visual */}
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
          <span>Ubicación Física:</span>
          <strong>{initialMovementData.location_name}</strong>
        </div>
        <div className={styles.metaRow}>
          <span>Saldo Inicial Registrado:</span>
          <span className={styles.stockText}>{Number(initialMovementData.quantity).toFixed(2)} uds</span>
        </div>
      </div>

      <div className={styles.flexGrid}>
        
        {/* Cantidad del Ajuste (Mermas van con signo negativo en Django) */}
        <div className={styles.gridHalf}>
          <FormInput
            label="Cantidad del Movimiento *"
            type="number"
            placeholder="Ej: -50 (Mermas) o 20 (Sobrante)"
            register={register('quantity', { valueAsNumber: true })}
            error={errors.quantity?.message}
          />
        </div>

        {/* Justificación Obligatoria */}
        <div className={styles.gridFull}>
          <FormInput
            label="Justificación Obligatoria del Ajuste / Informe de Merma *"
            type="text"
            placeholder="Ej: Rotura accidental de palet durante maniobra o caducidad insumo..."
            register={register('notes')}
            error={errors.notes?.message}
          />
        </div>

      </div>

      {/* Botonera de Acciones de Confirmación */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar Operación
        </FormButton>

        <FormButton type="submit" variant="primary" isLoading={isSubmitting} loadingText="Registrando Ajuste...">
          Confirmar Ajuste de Stock
        </FormButton>
      </div>

    </form>
  );
};