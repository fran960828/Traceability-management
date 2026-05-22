import React from 'react';
import { type Supplier } from '../../models/supplier.schema';
import { FormButton } from '../../../shared/components/formularios/FormButton';
import styles from './Supplier.delete.module.css';

interface SupplierDeleteFormProps {
  supplierData: Supplier; // Datos del proveedor a eliminar para mostrarlos en la advertencia
  onConfirm: (id: number) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const SupplierDeleteForm: React.FC<SupplierDeleteFormProps> = ({
  supplierData,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  
  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault(); // Evitamos que refresque la pantalla
    if (isSubmitting) return;
    onConfirm(supplierData.id);
  };

  return (
    <form onSubmit={handleDelete} className={styles.deleteContainer}>
      <div className={styles.iconWrapper}>
        {/* Un icono de advertencia visual */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.warningIcon}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>

      <h2 className={styles.deleteTitle}>¿Eliminar Proveedor?</h2>
      
      <p className={styles.deleteMessage}>
        Estás a punto de eliminar al proveedor <strong>{supplierData.name}</strong> ({supplierData.tax_id}).
      </p>
      
      <div className={styles.alertBox}>
        <p className={styles.alertText}>
          <strong>Atención:</strong> Esta acción dará de baja el código <code>{supplierData.supplier_code}</code>. Los pedidos de compra históricos asociados a este proveedor podrían verse afectados o quedar congelados.
        </p>
      </div>

      {/* BOTONERA DE ACCIONES DE SEGURIDAD */}
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
};