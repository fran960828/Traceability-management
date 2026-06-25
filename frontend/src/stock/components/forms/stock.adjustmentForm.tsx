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
  initialMovementData: StockMovement; // Recibe el lote contextual directo de la fila
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
      // 🟢 CAMBIO 1: El Serializer pide IDs planos, extraemos las claves primarias numéricas directamente
      batch: initialMovementData.batch as any,       
      location: initialMovementData.location as any, 
      quantity: '' as any,
      notes: '',
    },
  });

  // 2. Sincronización analítica forzada en el ciclo de montaje
  useEffect(() => {
    if (initialMovementData) {
      setValue('batch', initialMovementData.batch as any);
      setValue('location', initialMovementData.location as any);
    }
  }, [initialMovementData, setValue]);

  // 🟢 CAMBIO 2: INTERCEPTOR DE CONTROL DE SIGNOS AUTOMÁTICO
  const handleFormSubmit = (data: StockAdjustmentOutput) => {
    // Si el usuario escribió "50", lo convertimos matemáticamente en "-50" 
    // para cumplir el contrato del backend y de Zod sin forzarlo a teclear el signo menos.
    const cleanData = {
      ...data,
      quantity: data.quantity > 0 ? -data.quantity : data.quantity
    };
    onSubmit(cleanData);
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

      {/* METACARD DE AUDITORÍA */}
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
          <span>Saldo Disponible en esta Zona:</span>
          {/* 🟢 CAMBIO 3: Mostramos el saldo actual de la fila con mayor claridad conceptual */}
          <span className={styles.stockText}>{Number(initialMovementData.quantity).toFixed(3)} uds</span>
        </div>
      </div>

      <div className={styles.flexGrid}>
        
        {/* Cantidad del Ajuste */}
        <div className={styles.gridHalf}>
          <FormInput
            // 🟢 CAMBIO 4: Simplificamos la etiqueta y el placeholder para no confundir al usuario
            label="Cantidad a Retirar / Merma *"
            type="number"
            placeholder="Ej: 50"
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