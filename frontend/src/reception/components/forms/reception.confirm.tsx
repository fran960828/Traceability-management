// src/modules/inventory/components/forms/ReceptionForm.tsx
import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { BulkReceptionSchema, type BulkReceptionValues } from '../../models/reception.schema';
import type { PurchaseOrder } from '../../../purchase/models/purchase.schema';
import { useDataTable } from '../../../shared/hooks';
import { LocationService } from '../../../locations/services/location.service';

import {
  FormInput,
  FormSelect,
  FormButton,
} from '../../../shared/components/formInputs';

import styles from './reception.confirm.module.css';

export interface ReceptionFormProps {
  purchaseOrderData: PurchaseOrder;
  onSubmit: (values: BulkReceptionValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// 🟢 Estructura 100% nativa con drf-spectacular: la localización pertenece a cada ítem
interface FormReceptionValues {
  items: {
    order_item: number;
    location: string; // ID de la ubicación elegida para ESTE material específico
    material_name: string; 
    pending_quantity: number; 
    batch_number: string;
    quantity: number;
    expiry_date: string;
    notes: string;
    
  }[];
}

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

  // 2. Orquestación del formulario acoplado directamente al validador de Zod
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormReceptionValues>({
    resolver: zodResolver(BulkReceptionSchema) as any,
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
            location: '', // Cada línea arranca sin almacén asignado para obligar al operario a elegirlo
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

  // 4. El Submit es directo y transparente. Transmuta los strings numéricos nativamente
  const handleFormSubmit = (data: FormReceptionValues) => {
    const formattedPayload: BulkReceptionValues = {
      items: data.items.map(item => ({
        order_item: item.order_item,
        location: Number(item.location), // Casteo limpio por línea
        batch_number: item.batch_number,
        quantity: Number(item.quantity),
        expiry_date: item.expiry_date || null,
        notes: item.notes || '',
      })),
    };

    onSubmit(formattedPayload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={styles.formContainer} noValidate>
      
      {/* 🧾 CABECERA SIMPLE INFORMATIVA */}
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

      {errors.items?.root?.message && (
        <p className={`${styles.gridFull} ${styles.errorMessage}`}>
          {errors.items.root.message}
        </p>
      )}

      {fields.map((field, index) => {
        return (
          // Reajustamos la cuadrícula de la fila para dar espacio al selector de localización por línea
          <div key={field.id} className={styles.itemRow}>
            
            {/* Columna 1: Detalle del material e informativo de saldos */}
            <div>
              <label className={styles.inputLabel}>Material</label>
              <div className={styles.materialDisplay}>
                <span>{field.material_name}</span>
              </div>
            </div>

            {/* Columna 2: Selector de destino INDEPENDIENTE para cada artículo 🏢 */}
            <div>
              <FormSelect
                label="Almacen*"
                placeholder="Selecciona zona..."
                register={register(`items.${index}.location` as const, { required: true })}
                options={locationOptions}
                error={errors.items?.[index]?.location?.message}
                isLoading={isLoadingLocations}
              />
            </div>

            {/* Columna 3: Número de Lote del Proveedor */}
            <div>
              <FormInput
                label="Lote Físico *"
                type="text"
                placeholder="Ej: L2026-A"
                register={register(`items.${index}.batch_number` as const)}
                error={errors.items?.[index]?.batch_number?.message}
              />
            </div>

            {/* Columna 4: Cantidad del conteo físico */}
            <div>
              <FormInput
                label="Pendiente *"
                type="number"
                placeholder="1000"
                register={register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                error={errors.items?.[index]?.quantity?.message}
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