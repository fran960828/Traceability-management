import React from 'react';
import { FormButton } from '../formInputs';
import styles from './forms.delete.module.css'; // Reutiliza tus estilos unificados de borrado

interface GenericDeleteFormProps<TId> {
  id: TId;                     // El ID real del modelo (ej: number)
  title: string;               // Título modal (ej: "¿Eliminar Proveedor?")
  name: string;                // Nombre destacado (ej: labelData.name)
  subtitle?: string;           // Texto secundario opcional (ej: tax_id o brand_reference)
  codeLabel: string;           // Nombre del código técnico (ej: "código", "ID único")
  codeValue: string | number;  // Valor del código técnico (ej: supplier_code o internal_code)
  impactMessage: string;       // Frase específica sobre el impacto operativo en la bodega
  onConfirm: (id: TId) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function GenericDeleteForm<TId>({
  id,
  title,
  name,
  subtitle,
  codeLabel,
  codeValue,
  impactMessage,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: GenericDeleteFormProps<TId>) {
  
  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    onConfirm(id);
  };

  return (
    <form onSubmit={handleDelete} className={styles.deleteContainer}>
      <div className={styles.iconWrapper}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.warningIcon}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>

      <h2 className={styles.deleteTitle}>{title}</h2>
      
      <p className={styles.deleteMessage}>
        Estás a punto de eliminar el registro <strong>{name}</strong>{subtitle ? ` (${subtitle})` : ''}.
      </p>
      
      <div className={styles.alertBox}>
        <p className={styles.alertText}>
          <strong>Atención:</strong> Esta acción dará de baja el {codeLabel} <code>{codeValue}</code>. <span>{impactMessage}</span> 
        </p>
      </div>

      {/* BOTONERA DE ACCIONES DE SEGURIDAD HOMOGÉNEA */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          No, Cancelar
        </FormButton>
        
        <FormButton type="submit" variant="danger" disabled={isSubmitting} isLoading={isSubmitting} loadingText="Eliminando...">
          Sí, Eliminar
        </FormButton>
      </div>
    </form>
  );
}