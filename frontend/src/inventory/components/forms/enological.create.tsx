import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { 
  EnologicalFormSchema, 
  type EnologicalFormValues, 
  type EnologicalMaterial, 
  ENOLOGICAL_TYPES,  
} from '../../models/enological.schema';
import { UNIT_MESURE } from '../../models/label.schema';
import { 
  FormInput, 
  FormSelect, 
  FormCheckbox, 
  FormReadOnlyInput, 
  FormButton, 
  type ReadOnlyField 
} from '../../../shared/components/formInputs'; 

import { DEFAULT_ENOLOGICAL_VALUES, ENOLOGICAL_INPUTS_CONFIG } from '../../constants/enological.constants';
import styles from '../../../supplier/components/forms/Supplier.create.module.css'; 
import { useDataTable } from '../../../shared/hooks';
import type { SupplierPaginationResponse } from '../../../supplier/models';
import { SupplierService } from '../../../supplier/services';

export interface EnologicalFormProps {
  productInitialData?: EnologicalMaterial;
  onSubmit: (values: EnologicalFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  activeAction?: 'create' | 'edit';
}

export const EnologicalForm: React.FC<EnologicalFormProps> = ({
  productInitialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  activeAction = 'create',
}) => {
  const isEditMode = activeAction === 'edit' && !!productInitialData;

  // 1. Carga asíncrona de los proveedores maestros para el selector
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useDataTable<SupplierPaginationResponse>({
    key: 'suppliers',
    fetchFn: SupplierService.getAll,
  });
  
  const suppliersOptions = suppliersData?.results || [];

  // 2. Mapeos de los ENUMs de laboratorio a opciones legibles
  const enologicalTypeOptions = Object.values(ENOLOGICAL_TYPES).map((type) => ({
    id: type,
    name: type === 'ESTABILIZANTE' ? 'Estabilizantes (Gomas/Manoproteínas)' : 
          type === 'CONSERVANTE' ? 'Conservantes (Sulfitos/Ascórbico)' : 
          type === 'ACIDIFICANTE' ? 'Acidificantes y Correctores' : type,
  }));

  const unitMeasureOptions = Object.values(UNIT_MESURE).map((unit) => ({
    id: unit,
    name: unit,
  }));

  // 3. Inicialización del formulario controlado por Zod
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EnologicalFormValues>({
    resolver: zodResolver(EnologicalFormSchema),
    defaultValues: DEFAULT_ENOLOGICAL_VALUES,
  });

  // Re-hidratación limpia del formulario en modo edición
  useEffect(() => {
    reset(productInitialData ? productInitialData : DEFAULT_ENOLOGICAL_VALUES);
  }, [productInitialData, reset]);

  // Bloque Informativo Superior (Solo Lectura)
  const readOnlyFields: ReadOnlyField[] = isEditMode && productInitialData
    ? [
        { label: 'ID Interno Laboratorio', value: productInitialData.id },
        { label: 'Código de Trazabilidad ENO', value: productInitialData.internal_code },
        { label: 'Stock Actual Registrado', value: `${productPackagingDisplay(productInitialData)}` }
      ]
    : [];

  // Función auxiliar para formatear de forma segura las unidades de lectura
  function productPackagingDisplay(item: EnologicalMaterial) {
    const unit = item.unit_mesure_display ? item.unit_mesure_display.toLowerCase() : 'uds';
    return `${item.current_stock} ${unit}`;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.formContainer} noValidate>
      <h2 className={styles.formTitle}>
        {isEditMode ? 'Modificar Parámetros de Producto' : 'Registrar Producto Enológico'}
      </h2>

      <FormReadOnlyInput fields={readOnlyFields} />

      <div className={styles.flexGrid}>
        {/* INPUTS ESTÁTICOS FIJOS DESDE CONSTANTES (Name, Commercial Format, Min Stock) */}
        {ENOLOGICAL_INPUTS_CONFIG.map((input) => (
          <div 
            key={input.name} 
            className={input.halfWidth ? styles.gridHalf : styles.gridFull}
          >
            <FormInput
              label={input.label}
              type={input.type}
              placeholder={input.placeholder}
              register={register(input.name)}
              error={errors[input.name]?.message}
            />
          </div>
        ))}

        {/* SELECT 1: Tipología Enológica */}
        <div className={styles.gridHalf}>
          <FormSelect
            label="Clasificación Enológica *"
            placeholder="Selecciona grupo..."
            register={register('enological_type')}
            options={enologicalTypeOptions}
            error={errors.enological_type?.message}
          />
        </div>

        {/* SELECT 2: Proveedor de Productos Químicos */}
        <div className={styles.gridHalf}>
          <FormSelect
            label="Proveedor Homologado *"
            placeholder="Selecciona fabricante..."
            register={register('supplier', { valueAsNumber: true })}
            options={suppliersOptions}
            error={errors.supplier?.message}
            isLoading={isLoadingSuppliers}
          />
        </div>

        {/* SELECT 3: Unidad de Medida del Laboratorio */}
        <div className={styles.gridHalf}>
          <FormSelect
            label="Unidad de Medida Balanza *"
            placeholder="Selecciona cuantificación..."
            register={register('unit_mesure')}
            options={unitMeasureOptions}
            error={errors.unit_mesure?.message}
          />
        </div>
      </div>

      <FormCheckbox
        label="Producto verificado apto para tratamientos analíticos en bodega"
        register={register('is_active')}
        error={errors.is_active?.message}
      />

      <div style={{ marginTop: '12px' }}>
        <FormInput
          label="Observaciones o Alérgenos"
          placeholder="Ej: Contiene sulfitos, dosificación máx recomendada, precauciones de humedad..."
          register={register('description')}
          error={errors.description?.message}
          type="text"
        />
      </div>

      {/* BOTONERA HOMOGÉNEA DE CONTROL */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </FormButton>
  
        <FormButton type="submit" variant="primary" isLoading={isSubmitting} loadingText="Guardando...">
          {isEditMode ? 'Actualizar Ficha' : 'Crear Producto'}
        </FormButton>
      </div>
    </form>
  );
};