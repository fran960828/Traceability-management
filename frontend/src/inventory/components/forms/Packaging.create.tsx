import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { 
  PackagingFormSchema, 
  type PackagingFormValues, 
  type PackagingMaterial, 
  PACKAGING_TYPES,  
} from '../../models/packaging.schema';
import { UNIT_MESURE } from '../../models/label.schema';
import { 
  FormInput, 
  FormSelect, 
  FormCheckbox, 
  FormReadOnlyInput, 
  FormButton, 
  type ReadOnlyField 
} from '../../../shared/components/formInputs'; 

import { DEFAULT_PACKAGING_VALUES, PACKAGING_INPUTS_CONFIG } from '../../constants/packaging.constants';
import styles from '../../../supplier/components/forms/Supplier.create.module.css'; 
import { useDataTable } from '../../../shared/hooks';
import type { SupplierPaginationResponse } from '../../../supplier/models';
import { SupplierService } from '../../../supplier/services';

export interface PackagingFormProps {
  productInitialData?: PackagingMaterial;
  onSubmit: (values: PackagingFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  activeAction?: 'create' | 'edit';
}

export const PackagingForm: React.FC<PackagingFormProps> = ({
  productInitialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  activeAction = 'create',
}) => {
  const isEditMode = activeAction === 'edit' && !!productInitialData;

  // 1. Carga asíncrona de proveedores maestros
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useDataTable<SupplierPaginationResponse>({
    key: 'suppliers',
    fetchFn: SupplierService.getAll,
  });
  
  const suppliersOptions = suppliersData?.results || [];

  // 2. Mapeos de ENUMs locales para selectores
  const packagingTypeOptions = Object.values(PACKAGING_TYPES).map((type) => ({
    id: type,
    name: type === 'VIDRIO' ? 'Vidrio (Botellas)' : 
          type === 'CIERRE' ? 'Cierres (Corchos/Tapones)' : 
          type === 'EMBALAJE' ? 'Embalaje Seco (Cajas)' : type,
  }));

  const unitMeasureOptions = Object.values(UNIT_MESURE).map((unit) => ({
    id: unit,
    name: unit,
  }));

  // 3. Inicialización del formulario con Zod
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PackagingFormValues>({
    resolver: zodResolver(PackagingFormSchema),
    defaultValues: DEFAULT_PACKAGING_VALUES,
  });

  // 👁️ OBSERVADOR EN TIEMPO REAL: Evaluamos el tipo para el renderizado condicional inteligente
  const selectedType = watch('packaging_type');

  const showCapacity = ['VIDRIO', 'BIB', 'PLASTICO'].includes(selectedType);
  const showColor = ['VIDRIO', 'CAPSULA'].includes(selectedType);

  // Re-hidratación limpia ante cambios en modo edición
  useEffect(() => {
    reset(productInitialData ? productInitialData : DEFAULT_PACKAGING_VALUES);
  }, [productInitialData, reset]);

  // Bloque Informativo Automatizado (Solo Lectura)
  const readOnlyFields: ReadOnlyField[] = isEditMode && productInitialData
    ? [
        { label: 'ID Instancia', value: productInitialData.id },
        { label: 'Código PAC Técnico', value: productInitialData.internal_code },
        { label: 'Existencias Actuales', value: `${productInitialData.current_stock} ${productInitialData.unit_mesure_display.toLowerCase()}` }
      ]
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.formContainer} noValidate>

      <FormReadOnlyInput fields={readOnlyFields} />

      <div className={styles.flexGrid}>
        {/* INPUTS ESTÁTICOS FIJOS (Name, Specification, Min Stock) */}
        {PACKAGING_INPUTS_CONFIG.map((input) => (
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

        {/* SELECT 1: Tipo de Packaging Material */}
        <div className={styles.gridHalf}>
          <FormSelect
            label="Tipo de Material *"
            placeholder="Selecciona categoría..."
            register={register('packaging_type')}
            options={packagingTypeOptions}
            error={errors.packaging_type?.message}
          />
        </div>

        {/* SELECT 2: Proveedores desde TanStack Query */}
        <div className={styles.gridHalf}>
          <FormSelect
            label="Proveedor Fabricante *"
            placeholder="Selecciona origen..."
            register={register('supplier', { valueAsNumber: true })}
            options={suppliersOptions}
            error={errors.supplier?.message}
            isLoading={isLoadingSuppliers}
          />
        </div>

        {/* SELECT 3: Unidad de Distribución */}
        <div className={styles.gridHalf}>
          <FormSelect
            label="Unidad de Medida *"
            placeholder="Selecciona cuantificación..."
            register={register('unit_mesure')}
            options={unitMeasureOptions}
            error={errors.unit_mesure?.message}
          />
        </div>

        {/* ======================================================= */}
        {/* 🔄 SECCIÓN CONDICIONAL DINÁMICA (OPCIÓN A)              */}
        {/* ======================================================= */}
        
        {showCapacity && (
          <div className={styles.gridHalf}>
            <FormInput
              label="Capacidad Nominal (Litros) *"
              type="text"
              placeholder="Ej: 0.750, 1.500, 3.000"
              register={register('capacity')}
              error={errors.capacity?.message}
            />
          </div>
        )}

        {showColor && (
          <div className={styles.gridHalf}>
            <FormInput
              label="Color del Material *"
              type="text"
              placeholder="Ej: VERDE HOJA, TRANSPARENTE, NEGRO MATE"
              register={register('color')}
              error={errors.color?.message}
            />
          </div>
        )}
      </div>

      <FormCheckbox
        label="Material habilitado para planificación operativa y órdenes de embotellado"
        register={register('is_active')}
        error={errors.is_active?.message}
      />

      <div style={{ marginTop: '12px' }}>
        <FormInput
          label="Descripción o Tolerancias Técnicas"
          placeholder="Añade detalles del compuesto, micras, peso del palet, resistencia, etc..."
          register={register('description')}
          error={errors.description?.message}
        />
      </div>

      {/* BOTONERA HOMOGÉNEA DE SEGUIMIENTO */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </FormButton>
  
        <FormButton type="submit" variant="primary" isLoading={isSubmitting} loadingText="Guardando...">
          {isEditMode ? 'Actualizar Propiedades' : 'Crear Material'}
        </FormButton>
      </div>
    </form>
  );
};