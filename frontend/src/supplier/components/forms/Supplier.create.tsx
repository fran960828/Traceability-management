import React, { useEffect } from 'react';
import { useForm} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { SupplierFormSchema, type SupplierFormValues, type Supplier } from '../../models/supplier.schema';
import { CategoryService } from '../../services';

// 🔄 NUEVAS IMPORTACIONES: El pack completo de componentes genéricos
import { FormInput, FormSelect, FormCheckbox,FormReadOnlyInput,FormButton, type ReadOnlyField } from '../../../shared/components/formInputs'; 
import { DEFAULT_SUPPLIER_VALUES, INPUTS_CONFIG } from '../../constants/supplier.constants';
import styles from './Supplier.create.module.css';

export interface SupplierFormProps {
  supplierInitialData?: Supplier;
  onSubmit: (values: SupplierFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
  supplierInitialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const isEditMode = !!supplierInitialData;

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories-master'],
    queryFn: CategoryService.getCategories,
  });
  const categories = categoriesData?.results || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(SupplierFormSchema),
    defaultValues: DEFAULT_SUPPLIER_VALUES,
  });

  useEffect(() => {
    reset(supplierInitialData ? supplierInitialData : DEFAULT_SUPPLIER_VALUES);
  }, [supplierInitialData, reset]);

  // 🔄 CONTEXTO GENÉRICO: Mapeamos los campos de lectura obligatorios de forma limpia
  const readOnlyFields: ReadOnlyField[] = isEditMode && supplierInitialData
    ? [
        { label: 'ID Interno', value: supplierInitialData.id },
        { label: 'Código de Proveedor', value: supplierInitialData.supplier_code }
      ]
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.formContainer} noValidate>
      <h2 className={styles.formTitle}>
        {isEditMode ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      </h2>

      {/* 🔄 REEMPLAZO 1: Bloque de Solo Lectura Automatizado */}
      <FormReadOnlyInput fields={readOnlyFields} />

      {/* CONTENEDOR FLEX-WRAP PARA LOS INPUTS MAPEADOS */}
      <div className={styles.flexGrid}>
        
        {INPUTS_CONFIG.map((input) => {
          const registerOptions = input.name === 'lead_time' ? { valueAsNumber: true } : {};

          return (
            <div 
              key={input.name} 
              className={input.halfWidth ? styles.gridHalf : styles.gridFull}
            >
              <FormInput
                label={input.label}
                type={input.type}
                placeholder={input.placeholder}
                register={register(input.name, registerOptions)}
                error={errors[input.name]?.message}
              />
            </div>
          );
        })}

        {/* 🔄 REEMPLAZO 2: Select maestro de categorías integrado en el flujo Flexbox */}
        <div className={styles.gridHalf}>
          <FormSelect
            label="Categoría *"
            placeholder="Selecciona una categoría..."
            register={register('category', { valueAsNumber: true })}
            options={categories}
            error={errors.category?.message}
            isLoading={isLoadingCategories}
          />
        </div>
      </div>

      {/* 🔄 REEMPLAZO 3: Checkbox genérico controlado */}
      <FormCheckbox
        label="Proveedor activo para compras y pedidos de la bodega"
        register={register('is_active')}
        error={errors.is_active?.message}
      />

      {/* BOTONERA DE ACCIONES */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </FormButton>
  
        <FormButton type="submit" variant="primary" isLoading={isSubmitting} loadingText="Guardando...">
          {isEditMode ? 'Actualizar Proveedor' : 'Crear Proveedor'}
        </FormButton>
      </div>
    </form>
  );
};