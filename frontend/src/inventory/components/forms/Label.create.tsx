import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { LabelFormSchema, type LabelFormValues, type LabelMaterial, LABEL_TYPES, UNIT_MESURE } from '../../models/label.schema';

import { 
  FormInput, 
  FormSelect, 
  FormCheckbox, 
  FormReadOnlyInput, 
  FormButton, 
  type ReadOnlyField 
} from '../../../shared/components/formInputs'; 
import { DEFAULT_LABEL_VALUES, LABEL_INPUTS_CONFIG } from '../../constants';
import styles from '../../../supplier/components/forms/Supplier.create.module.css'; // Mismo archivo CSS que nos has pasado
import { useDataTable } from '../../../shared/hooks';
import type { SupplierPaginationResponse } from '../../../supplier/models';
import { SupplierService } from '../../../supplier/services';

export interface LabelFormProps {
  productInitialData?: LabelMaterial;
  onSubmit: (values: LabelFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  activeAction?: 'create' | 'edit' | 'clone'; // Extra opcional para el control estricto del botón
}

export const LabelForm: React.FC<LabelFormProps> = ({
  productInitialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  activeAction = 'create',
}) => {
  // Evaluamos si estamos en modo edición real basándonos en si la URL dicta 'edit' y vienen datos
  const isEditMode = activeAction === 'edit' && !!productInitialData;

  // Carga asíncrona de proveedores maestros para alimentar el primer FormSelect
  const { data:suppliersData, isLoading:isLoadingSuppliers } = useDataTable<SupplierPaginationResponse>({
      key: 'suppliers',
      fetchFn: SupplierService.getAll,
    });
  
  // Mapeamos los proveedores al formato de opciones del select [{ id: X, name: 'Y' }]
  const suppliersOptions = suppliersData?.results || [];

  // Mapeamos los enums locales a un array compatible con FormSelect
  const labelTypeOptions = Object.values(LABEL_TYPES).map((type) => ({
    id: type, // Django espera el valor string en mayúsculas (Ej: "FRONTAL")
    name: type,
  }));

  const unitMeasureOptions = Object.values(UNIT_MESURE).map((unit) => ({
    id: unit, // Django espera el valor string en mayúsculas (Ej: "UNIDAD")
    name: unit,
  }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LabelFormValues>({
    resolver: zodResolver(LabelFormSchema),
    defaultValues: DEFAULT_LABEL_VALUES,
  });

  // Re-hidratamos el formulario si cambian los datos iniciales (Ej: Al cargar los datos del clone-prefill)
  useEffect(() => {
    reset(productInitialData ? productInitialData : DEFAULT_LABEL_VALUES);
  }, [productInitialData, reset]);

  // Bloque Informativo Automatizado (Solo lectura): 
  // En modo clonación NO se muestra porque el nuevo producto nacerá con un ID e internal_code diferentes creados por Django
  const readOnlyFields: ReadOnlyField[] = isEditMode && productInitialData
    ? [
        { label: 'ID Interno', value: productInitialData.id },
        { label: 'Código Único de Material', value: productInitialData.internal_code },
        { label: 'Existencias en Bodega', value: `${productInitialData.current_stock} ${productInitialData.unit_mesure_display.toLowerCase()}` }
      ]
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.formContainer} noValidate>
      <h2 className={styles.formTitle}>
        {isEditMode ? 'Modificar Etiqueta' : activeAction === 'clone' ? 'Clonar Añada de Etiqueta' : 'Registrar Nueva Etiqueta'}
      </h2>

      {/* Bloque de Solo Lectura Automatizado */}
      <FormReadOnlyInput fields={readOnlyFields} />

      {/* CONTENEDOR FLEX-WRAP PARA LOS INPUTS MAPEADOS EN LAS CONSTANTES */}
      <div className={styles.flexGrid}>
        
        {LABEL_INPUTS_CONFIG.map((input) => (
          <div 
            key={input.name} 
            className={input.halfWidth ? styles.gridHalf : styles.gridFull}
          >
            <FormInput
              label={input.label}
              type={input.type}
              placeholder={input.placeholder}
              register={register(input.name, input.name === 'vintage' ? { valueAsNumber: true } : {})}
              error={errors[input.name]?.message}
            />
          </div>
        ))}

        {/* SELECT 1: Proveedores Maestros desde TanStack Query */}
        <div className={styles.gridHalf}>
          <FormSelect
            label="Proveedor Asignado *"
            placeholder="Selecciona un fabricante..."
            register={register('supplier', { valueAsNumber: true })}
            options={suppliersOptions}
            error={errors.supplier?.message}
            isLoading={isLoadingSuppliers}
          />
        </div>

        {/* SELECT 2: Tipo / Posición de Etiqueta desde ENUM */}
        <div className={styles.gridHalf}>
          <FormSelect
            label="Tipo de Etiqueta *"
            placeholder="Selecciona posición..."
            register={register('label_type')}
            options={labelTypeOptions}
            error={errors.label_type?.message}
          />
        </div>

        {/* SELECT 3: Unidad de Medida desde ENUM */}
        <div className={styles.gridHalf}>
          <FormSelect
            label="Unidad de Medida *"
            placeholder="Selecciona cuantificación..."
            register={register('unit_mesure')}
            options={unitMeasureOptions}
            error={errors.unit_mesure?.message}
          />
        </div>
      </div>

      {/* Checkbox genérico controlado */}
      <FormCheckbox
        label="Material activo disponible para órdenes de embotellado"
        register={register('is_active')}
        error={errors.is_active?.message}
      />

      {/* Descripción adicional a ancho completo */}
      <div style={{ marginTop: '12px' }}>
        <FormInput
          label="Descripción o Notas Técnicas"
          placeholder="Añade especificaciones del papel, stamping, relieves, etc..."
          register={register('description')}
          error={errors.description?.message}
        />
      </div>

      {/* BOTONERA DE ACCIONES DE SEGURIDAD */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </FormButton>
  
        <FormButton type="submit" variant="primary" isLoading={isSubmitting} loadingText="Guardando...">
          {isEditMode ? 'Actualizar Etiqueta' : activeAction === 'clone' ? 'Confirmar Clonación' : 'Crear Etiqueta'}
        </FormButton>
      </div>
    </form>
  );
};