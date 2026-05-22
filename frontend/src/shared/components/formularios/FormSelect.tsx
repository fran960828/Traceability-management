import React from 'react';
import { type UseFormRegisterReturn } from 'react-hook-form';
import styles from './FormSelect.module.css';

// Interfaz genérica para las opciones del select
export interface SelectOption {
  id: string | number;
  name: string;
}

interface FormSelectProps {
  label: string;
  placeholder?: string;
  register: UseFormRegisterReturn; // El resultado de register("category", ...)
  options: SelectOption[];
  error?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  placeholder = 'Selecciona una opción...',
  register,
  options,
  error,
  isLoading = false,
  disabled = false,
}) => {
  const selectId = register.name;

  return (
    <div className={styles.formGroup}>
      <label htmlFor={selectId} className={styles.label}>
        {label}
      </label>
      <div className={styles.inputWrapper}>
        <select
          id={selectId}
          className={`${styles.select} ${error ? styles.inputError : ''}`}
          disabled={disabled || isLoading}
          {...register}
        >
          <option value="">
            {isLoading ? 'Cargando opciones...' : placeholder}
          </option>
          
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
};