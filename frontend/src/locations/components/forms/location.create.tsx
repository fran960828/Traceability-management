// src/modules/inventory/components/forms/location.create.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { 
  LocationFormSchema, 
  type LocationFormValues, 
  type Location 
} from '../../models/location.schema';

import { 
  FormInput, 
  FormCheckbox, 
  FormReadOnlyInput, 
  FormButton, 
  type ReadOnlyField 
} from '../../../shared/components/formInputs';

import { DEFAULT_LOCATION_VALUES, LOCATION_INPUTS_CONFIG } from '../../constants/location.constants';
// Reutilizamos el archivo de estilos modulares específico que creamos para Purchase para no duplicar código CSS
import styles from '../../../purchase/components/forms/purchase.create.module.css';

export interface LocationFormProps {
  locationInitialData?: Location;
  onSubmit: (values: LocationFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const LocationForm: React.FC<LocationFormProps> = ({
  locationInitialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const isEditMode = !!locationInitialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(LocationFormSchema),
    defaultValues: DEFAULT_LOCATION_VALUES,
  });

  // Re-hidratación limpia ante conmutación de datos o edición activa
  useEffect(() => {
    reset(locationInitialData ? locationInitialData : DEFAULT_LOCATION_VALUES);
  }, [locationInitialData, reset]);

  // Mapeamos los campos de lectura automatizados de auditoría si estamos editando
  const readOnlyFields: ReadOnlyField[] = isEditMode && locationInitialData
    ? [
        { label: 'ID Ubicación Sistema', value: locationInitialData.id },
        { label: 'Fecha Alta DRF', value: new Date(locationInitialData.created_at).toLocaleDateString('es-ES') }
      ]
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.formContainer} noValidate>

      {/* Bloque de Solo Lectura de Trazabilidad */}
      <FormReadOnlyInput fields={readOnlyFields} />

      {/* CONTENEDOR GRID REUTILIZABLE PARA LOS INPUTS */}
      <div className={styles.flexGrid}>
        {LOCATION_INPUTS_CONFIG.map((input) => (
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
      </div>

      {/* Checkbox genérico para conmutar disponibilidad del muelle */}
      <div className={styles.flexGrid}>
        <div className={styles.gridFull}>
          <FormCheckbox
            label="Ubicación activa disponible para recibir entradas por muelle y transferencias de existencias"
            register={register('is_active')}
            error={errors.is_active?.message}
          />
        </div>
      </div>

      {/* BOTONERA DE ACCIONES OPERATIVAS */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </FormButton>
  
        <FormButton type="submit" variant="primary" isLoading={isSubmitting} loadingText="Guardando Zona...">
          {isEditMode ? 'Actualizar Localización' : 'Establecer Ubicación'}
        </FormButton>
      </div>
    </form>
  );
};