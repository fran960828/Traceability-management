import React from 'react';
import { type UseFormRegisterReturn } from 'react-hook-form';
import styles from './FormCheckBox.module.css';

interface FormCheckboxProps {
  label: string;
  register: UseFormRegisterReturn; // Resultado de register('is_active')
  error?: string;
  disabled?: boolean;
}

export const FormCheckbox: React.FC<FormCheckboxProps> = ({
  label,
  register,
  error,
  disabled = false,
}) => {
  const checkboxId = register.name;

  return (
    <div className={styles.checkboxContainer}>
      <div className={styles.checkboxWrapper}>
        <input
          id={checkboxId}
          type="checkbox"
          className={`${styles.checkbox} ${error ? styles.checkboxError : ''}`}
          disabled={disabled}
          {...register}
        />
        <label htmlFor={checkboxId} className={styles.checkboxLabel}>
          {label}
        </label>
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
};