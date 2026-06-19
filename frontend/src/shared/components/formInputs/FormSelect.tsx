import React from 'react';
import { type UseFormRegisterReturn } from 'react-hook-form';
import styles from './FormSelect.module.css';

export interface SelectOption {
  id: string | number;
  name: string;
}

interface FormSelectProps {
  label: string;
  placeholder?: string;
  register: UseFormRegisterReturn;
  options: SelectOption[];
  error?: string;
  isLoading?: boolean;
  disabled?: boolean;
  readOnly?: boolean; // 🟢 1. Añadimos la propiedad opcional a la interfaz
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  placeholder = 'Selecciona una opción...',
  register,
  options,
  error,
  isLoading = false,
  disabled = false,
  readOnly = false, // 🟢 2. Inicializamos por defecto en false
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
          /* 🟢 3. Si es readOnly, añadimos una clase CSS de bloqueo visual y deshabilitamos las flechas */
          className={`${styles.select} ${error ? styles.inputError : ''} ${readOnly ? styles.readOnlySelect : ''}`}
          disabled={disabled || isLoading}
          /* 🟢 4. Truco de accesibilidad: si es readOnly, evitamos que el usuario cambie el valor con el teclado */
          onKeyDown={readOnly ? (e) => e.preventDefault() : undefined}
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