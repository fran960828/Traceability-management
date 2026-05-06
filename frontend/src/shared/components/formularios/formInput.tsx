import React from 'react';
import {type UseFormRegisterReturn } from 'react-hook-form';
import styles from './formInput.module.css';

interface FormInputProps {
  label: string;
  type?: string;
  placeholder?: string;
  register: UseFormRegisterReturn; // El resultado de register("name")
  error?: string;
  children?: React.ReactNode; // Para el botón del "ojo"
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  type = 'text',
  placeholder,
  register,
  error,
  children
}) => {
  const inputId = register.name;

  return (
    <div className={styles.formGroup}>
      <label htmlFor={inputId} className={styles.label}>{label}</label>
      <div className={styles.inputWrapper}>
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          {...register}
        />
        {children}
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
};