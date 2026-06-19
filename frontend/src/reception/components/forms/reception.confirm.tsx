// src/modules/inventory/components/forms/ReceptionForm.tsx
import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';;
import { BulkReceptionSchema, type BulkReceptionInput,type BulkReceptionOutput } from '../../models/reception.schema';
import type { PurchaseOrder } from '../../../purchase/models/purchase.schema';
import { useDataTable } from '../../../shared/hooks';
import { LocationService } from '../../../locations/services/location.service';

import {
  FormInput,
  FormSelect,
  FormButton,
} from '../../../shared/components/formInputs';

// Usamos tus estilos mapeados correctamente
import styles from './reception.confirm.module.css';

export interface ReceptionFormProps {
  purchaseOrderData: PurchaseOrder;
  onSubmit: (values: BulkReceptionOutput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// 🟢 Unificación de tipos usando Zod como única fuente de verdad para evitar rupturas de referencias


export const ReceptionForm: React.FC<ReceptionFormProps> = ({
  purchaseOrderData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  // 1. Carga del catálogo maestro de ubicaciones para los selectores de las líneas
  const { data: locationsData, isLoading: isLoadingLocations } = useDataTable({
    key: 'locations-select',
    fetchFn: LocationService.getAll,
  });

  const locationOptions = (locationsData?.results || [])
    .filter(loc => loc.is_active)
    .map(loc => ({ id: loc.id, name: loc.name }));

  // 2. Orquestación del formulario acoplado directamente al validador de Zod sin parches de tipos "as any"
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BulkReceptionInput, any, BulkReceptionOutput>({
    resolver: zodResolver(BulkReceptionSchema),
    defaultValues: {
      items: [],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: 'items',
  });

  // 3. Hidratación inicial: Pasamos las líneas de la orden a la rejilla de recepción
  useEffect(() => {
    if (purchaseOrderData && purchaseOrderData.items) {
      const initialItems = purchaseOrderData.items
        .map(item => {
          const pending = item.quantity_ordered - item.quantity_received;
          return {
            order_item: item.id,
            location: '' as any, // Forzamos cadena vacía inicial para disparar la validación si no se selecciona
            material_name: item.material_name || 'Insumo de Bodega',
            pending_quantity: pending > 0 ? pending : 0,
            batch_number: '',
            quantity: pending > 0 ? pending : 0, 
            expiry_date: '',
            notes: '',
          };
        })
        .filter(item => item.pending_quantity > 0);

      reset({
        items: initialItems,
      });
    }
  }, [purchaseOrderData, reset]);

  // 4. El Submit ya recibe la estructura depurada y parseada directamente por el validador de Zod
  const handleFormSubmit = (data: BulkReceptionOutput) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={styles.formContainer} noValidate>
      
      {/* 🧾 CABECERA INFORMATIVA */}
      <h3 className={styles.formTitle}>
        Recepción de Pedido - {purchaseOrderData.order_number}
      </h3>

      <div className={styles.flexGrid}>
        <div className={styles.gridFull}>
          <div className={styles.supplierCard}>
            <span className={styles.supplierLabel}>Proveedor Suministrador Homologado:</span>
            <strong className={styles.supplierValue}>{purchaseOrderData.supplier_name}</strong>
          </div>
        </div>
      </div>

      {/* 📦 SECCIÓN DE LÍNEAS ASIMÉTRICAS HORIZONTALES */}
      <h3 className={styles.formSubtitle}>
        Desglose de Entrada y Destinos en Muelle *
      </h3>

      {/* Alerta de error global del array (por ejemplo si el array viene vacío) */}
      {errors.items?.root?.message && (
        <p className={`${styles.gridFull} ${styles.errorMessage}`} style={{ color: 'var(--color-error, #dc2626)', margin: '10px 0' }}>
          {errors.items.root.message}
        </p>
      )}

      {fields.map((field, index) => {
        // Obtenemos los posibles errores específicos de esta iteración de fila
        const itemErrors = errors.items?.[index];

        return (
          <div key={field.id} className={styles.itemRow} style={{ marginBottom: '15px' }}>
            
            {/* Columna 1: Detalle del material e informativo de saldos */}
            <div>
              <label className={styles.inputLabel}>Material</label>
              <div className={styles.materialDisplay}>
                <span>{field.material_name}</span>
                <span style={{ fontSize: '0.85em', color: '#666', display: 'block' }}>
                  (Máx. esperado: {field.pending_quantity})
                </span>
              </div>
            </div>

            {/* Columna 2: Selector de destino INDEPENDIENTE para cada artículo 🏢 */}
            <div>
              <FormSelect
                label="Almacén *"
                placeholder="Selecciona zona..."
                register={register(`items.${index}.location` as const)}
                options={locationOptions}
                error={itemErrors?.location?.message}
                isLoading={isLoadingLocations}
              />
            </div>

            {/* Columna 3: Número de Lote del Proveedor 🏷️ */}
            <div>
              <FormInput
                label="Lote Físico *"
                type="text"
                placeholder="Ej: L2026-A"
                register={register(`items.${index}.batch_number` as const)}
                error={itemErrors?.batch_number?.message}
              />
            </div>

            {/* Columna 4: Cantidad del conteo físico 🔢 */}
            <div>
              <FormInput
                label="Cantidad a Recibir *"
                type="number"
                placeholder="1000"
                register={register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                error={itemErrors?.quantity?.message}
              />
            </div>

          </div>
        );
      })}

      {/* 🔘 ACCIONES DE CONFIRMACIÓN */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </FormButton>

        <FormButton type="submit" variant="primary" isLoading={isSubmitting} loadingText="Registrando Entrada...">
          Confirmar Entrada de Almacén
        </FormButton>
      </div>
    </form>
  );
};