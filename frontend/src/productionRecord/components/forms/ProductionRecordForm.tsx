// src/modules/production_record/components/forms/ProductionOrderForm.tsx
import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  ProductionOrderSchema,
  type ProductionOrderInput,
  type ProductionOrder,
} from '../../models/productionRecord.schema';

import {
  FormInput,
  FormSelect,
  FormReadOnlyInput,
  FormButton,
  type ReadOnlyField
} from '../../../shared/components/formInputs';

import { useDataTable } from '../../../shared/hooks';
import { EnologicalService } from '../../../inventory/services/enological.service';
import { WineService } from '../../../wines/services/wines.service'; 

// 🟢 CAMBIO 1: Importamos exclusivamente su nueva hoja de estilos dedicada
import styles from './ProductionRecordForm.module.css';

export interface ProductionOrderFormProps {
  productInitialData?: ProductionOrder;
  onSubmit: (values: ProductionOrderInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  activeAction?: 'create' | 'edit' | 'clone';
}

export const ProductionOrderForm: React.FC<ProductionOrderFormProps> = ({
  productInitialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  activeAction = 'create',
}) => {
  const isEditMode = activeAction === 'edit' && !!productInitialData;

  // =======================================================
  // 🔄 CARGA DE CATÁLOGOS INTEGRADOS (MAESTROS)
  // =======================================================
  const { data: winesData } = useDataTable({ key: 'wines-production-select', fetchFn: WineService.getAll });
  const { data: enologicalData } = useDataTable({ key: 'eno-production-select', fetchFn: EnologicalService.getAll });

  const wineOptions = (winesData?.results || [])
    .filter(w => w.is_active)
    .map(w => ({ id: w.id, name: w.name }));

  const enologicalOptions = (enologicalData?.results || []).map(e => ({ 
    id: e.id, 
    name: `${e.name} [${e.commercial_format}]` 
  }));

  // =======================================================
  // 🔧 ORQUESTACIÓN DEL FORMULARIO DE PRODUCCIÓN
  // =======================================================
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductionOrderInput>({
    resolver: zodResolver(ProductionOrderSchema) as any,
    defaultValues: {
      wine: 0,
      production_date: new Date().toISOString().split('T')[0],
      quantity_produced: 0,
      lot_number: '',
      bulk_liters_withdrawn: 0,
      notes: '',
      enological_materials: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'enological_materials',
  });

  useEffect(() => {
    if (productInitialData) {
      reset({
        wine: productInitialData.wine,
        production_date: productInitialData.production_date || '',
        quantity_produced: productInitialData.quantity_produced,
        lot_number: activeAction === 'clone' ? '' : productInitialData.lot_number,
        bulk_liters_withdrawn: Number(productInitialData.bulk_liters_withdrawn),
        notes: productInitialData.notes || '',
        enological_materials: (productInitialData.enological_materials || []).map(mat => ({
          material: mat.material,
          quantity_used: Number(mat.quantity_used),
        })),
      });
    }
  }, [productInitialData, reset, activeAction]);

  const readOnlyFields: ReadOnlyField[] = isEditMode && productInitialData
    ? [
        { label: 'Estado Operativo del Parte', value: productInitialData.status_display },
        { label: 'Responsable del Registro', value: productInitialData.user_username },
        { label: 'Litros Netos Teóricos', value: `${Number(productInitialData.total_liters).toFixed(2)} L` },
        { label: 'Mermas Declaradas', value: `${Number(productInitialData.loss_liters).toFixed(2)} L (${productInitialData.loss_percentage}%)` }
      ]
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit) as any} className={styles.formContainer} noValidate>
      {isEditMode && <FormReadOnlyInput fields={readOnlyFields} />}

      {/* 🍇 SECCIÓN 1: CABECERA Y DATOS DE CONTROL LÍQUIDO */}
      <h3 className={styles.formTitle}>Cabecera e Integridad del Embotellado</h3>
      
      <div className={styles.flexGrid}>
        <div className={styles.gridHalf}>
          <FormSelect
            label="Vino Varietal a Procesar *"
            placeholder="Selecciona vino de las cubas..."
            register={register('wine')}
            options={wineOptions}
            error={errors.wine?.message}
            disabled={isEditMode}
          />
        </div>
        
        <div className={styles.gridHalf}>
          <FormInput
            label="Lote de Producto Terminado *"
            type="text"
            placeholder="Ej: L26-042"
            register={register('lot_number')}
            error={errors.lot_number?.message}
          />
        </div>

        <div className={styles.gridHalf}>
          <FormInput
            label="Fecha de Embotellado *"
            type="date"
            register={register('production_date')}
            error={errors.production_date?.message}
          />
        </div>

        <div className={styles.gridHalf}>
          <FormInput
            label="Cantidad Producida (Unidades) *"
            type="number"
            placeholder="Ej: 2500 botellas"
            register={register('quantity_produced', { valueAsNumber: true })}
            error={errors.quantity_produced?.message}
          />
        </div>

        <div className={styles.gridFull}>
          <FormInput
            label="Litros Extraídos de Depósito (Caudalímetro) *"
            type="number"
            placeholder="Ej: 1875.50"
            register={register('bulk_liters_withdrawn', { valueAsNumber: true })}
            error={errors.bulk_liters_withdrawn?.message}
          />
        </div>

        <div className={styles.gridFull}>
          <FormInput
            label="Observaciones / Incidencias de la Línea"
            type="text"
            placeholder="Notas aclaratorias sobre el filtrado, mermas o taponado..."
            register={register('notes')}
            error={errors.notes?.message}
          />
        </div>
      </div>

      {/* 🧪 SECCIÓN 2: COMPUESTOS ENOLÓGICOS (DINÁMICO) */}
      {/* 🟢 CAMBIO 2: Aplicamos la nueva clase combinada sin usar selectores inline */}
      <h3 className={`${styles.formTitle} ${styles.sectionSubTitle}`}>
        Aditivos e Insumos Químicos Aplicados (Tratamiento del Lote)
      </h3>

      {fields.length === 0 ? (
        /* 🟢 CAMBIO 3: Estilizado limpio mediante clase dedicada de CSS Modules */
        <div className={`${styles.gridFull} ${styles.emptyStatePlaceholder}`}>
          No se han declarado tratamientos enológicos manuales para este lote. El sistema calculará los consumos base de la receta fija (vidrio, tapón, cápsula y etiquetas) de forma automática.
        </div>
      ) : (
        fields.map((field, index) => (
          <div key={field.id} className={styles.itemRow}>
            
            {/* 🟢 CAMBIO 4: Reemplazamos flexbox inline por clases específicas de proporción horizontal */}
            <div className={styles.inputMaterialFlex}>
              <FormSelect
                label={`Insumo #${index + 1}`}
                placeholder="Selecciona levadura, sulfito..."
                register={register(`enological_materials.${index}.material` as const)}
                options={enologicalOptions}
                error={errors.enological_materials?.[index]?.material?.message}
              />
            </div>

            <div className={styles.inputQuantityFlex}>
              <FormInput
                label="Cantidad Total *"
                type="number"
                placeholder="Ej: 1.500"
                register={register(`enological_materials.${index}.quantity_used` as const, { valueAsNumber: true })}
                error={errors.enological_materials?.[index]?.quantity_used?.message}
              />
            </div>

            <div className={styles.btnRemoveX}>
              <FormButton type="button" variant="danger" onClick={() => remove(index)}>
                X
              </FormButton>
            </div>
          </div>
        ))
      )}

      {/* 🟢 CAMBIO 5: Agregamos el contenedor sin el margin-top inline anterior */}
      <div className={`${styles.flexGrid} ${styles.flexGridAppendix}`}>
        <div className={styles.gridFull}>
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => append({ material: 0, quantity_used: 0 })}
          >
            + Declarar Tratamiento Enológico Manual
          </FormButton>
        </div>
      </div>

      {/* 🔘 SECCIÓN 3: ACCIONES DE EMISIÓN DE PARTE */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </FormButton>

        <FormButton type="submit" variant="primary" isLoading={isSubmitting} loadingText="Sincronizando Línea...">
          {isEditMode ? 'Actualizar Parte' : activeAction === 'clone' ? 'Confirmar Clonación' : 'Registrar Parte de Embotellado'}
        </FormButton>
      </div>
    </form>
  );
};