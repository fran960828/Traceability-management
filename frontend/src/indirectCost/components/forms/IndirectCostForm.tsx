// src/modules/pricing/components/forms/IndirectCostForm.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  IndirectCostConfigSchema,
  type IndirectCostConfigFormValues,
  type IndirectCostConfig,
} from '../../models/indirectCost.schema';

import {
  FormInput,
  FormCheckbox,
  FormReadOnlyInput,
  FormButton,
  type ReadOnlyField,
} from '../../../shared/components/formInputs';

import { DEFAULT_INDIRECT_COST_VALUES, INDIRECT_COST_INPUTS_CONFIG } from '../../constants/indirectCost.constants';
import styles from './IndirectCostForm.module.css';

export interface IndirectCostFormProps {
  initialData?: IndirectCostConfig;
  onSubmit: (values: IndirectCostConfigFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const IndirectCostForm: React.FC<IndirectCostFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const isEditMode = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IndirectCostConfigFormValues>({
    resolver: zodResolver(IndirectCostConfigSchema) as any,
    defaultValues: DEFAULT_INDIRECT_COST_VALUES,
  });

  // Hidratación del formulario ante edición o reinicio a valores por defecto
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        labor_rate: Number(initialData.labor_rate),
        energy_rate: Number(initialData.energy_rate),
        amortization_rate: Number(initialData.amortization_rate),
        is_active: initialData.is_active,
      });
    } else {
      reset(DEFAULT_INDIRECT_COST_VALUES);
    }
  }, [initialData, reset]);

  // Metadatos de solo lectura para auditoría
  const readOnlyFields: ReadOnlyField[] = isEditMode && initialData
    ? [
        { label: 'Identificador Único', value: initialData.id },
        { label: 'Fecha de Alta', value: new Date(initialData.created_at).toLocaleDateString('es-ES') },
      ]
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit) as any} className={styles.formContainer} noValidate>
      {/* Bloque de metadatos en modo edición */}
      <FormReadOnlyInput fields={readOnlyFields} />

      {/* Rejilla adaptativa de campos de entrada */}
      <div className={styles.flexGrid}>
        {INDIRECT_COST_INPUTS_CONFIG.map((input) => {
          const isNumeric = input.type === 'number';
          const registerOptions = isNumeric ? { valueAsNumber: true } : {};

          return (
            <div
              key={input.name}
              className={input.halfWidth ? styles.gridHalf : styles.gridFull}
            >
              <FormInput
                label={input.label}
                type={input.type || 'text'}
                placeholder={input.placeholder}
                register={register(input.name, registerOptions)}
                error={errors[input.name]?.message}
              />
            </div>
          );
        })}
      </div>

      {/* Indicador de estado activo de la configuración */}
      <FormCheckbox
        label="Establecer como la configuración de tasas vigente (se desactivarán automáticamente las demás)"
        register={register('is_active')}
        error={errors.is_active?.message}
      />

      {/* Botonera de acciones */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </FormButton>

        <FormButton type="submit" variant="primary" isLoading={isSubmitting} loadingText="Guardando...">
          {isEditMode ? 'Actualizar Tasas' : 'Crear Configuración'}
        </FormButton>
      </div>
    </form>
  );
};