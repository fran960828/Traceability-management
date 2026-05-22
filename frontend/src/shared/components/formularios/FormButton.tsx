import React from 'react';
import styles from './FormButton.module.css';

interface FormButtonProps {
  children: React.ReactNode; // El texto o contenido del botón por defecto
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger'; // Los tres estilos corporativos
  loadingText?: string; // Texto que se mostrará cuando esté cargando (ej: "Guardando...")
  isLoading?: boolean; // Controla si el formulario se está enviando
  onClick?: () => void;
  disabled?: boolean;
}

export const FormButton: React.FC<FormButtonProps> = ({
  children,
  type = 'button',
  variant = 'primary',
  loadingText,
  isLoading = false,
  onClick,
  disabled = false,
}) => {
  // Asignamos la clase CSS correspondiente según la variante elegida
  const variantClass = styles[variant] || styles.primary;

  return (
    <button
      type={type}
      className={`${styles.btnBase} ${variantClass}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
};