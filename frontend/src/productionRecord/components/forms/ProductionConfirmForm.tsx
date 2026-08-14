// src/modules/production_record/components/forms/ProductionConfirmForm.tsx
import React from 'react';
import { FormButton } from '../../../shared/components/formInputs';
import { type ProductionOrder } from '../../models/productionRecord.schema';
import styles from './ProductionConfirmForm.module.css';

interface ProductionConfirmFormProps {
  order: ProductionOrder;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export const ProductionConfirmForm: React.FC<ProductionConfirmFormProps> = ({
  order,
  onConfirm,
  onCancel,
  isSubmitting = false,
  errorMessage=null
}) => {
  return (
    <div className={styles.container}>
      {errorMessage && (
        <div className={styles.error}>
          ⚠️ Error de Confirmación: {errorMessage}
        </div>
      )}
      {/* ⚠️ BANNER DE ADVERTENCIA INDUSTRIAL */}
      <div className={styles.warningBanner}>
        <div className={styles.warningIcon}>⚠️</div>
        <div className={styles.warningText}>
          <strong>Acción Transaccional Irreversible</strong>
          <p>
            Al confirmar este parte de embotellado, se disparará el cierre oficial del registro y la ejecución automática del consumo de materias primas por rotación <strong>FIFO</strong>.
          </p>
        </div>
      </div>

      {/* 📊 RESUMEN TÉCNICO DEL PARTE */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Vino Base a Consumir</span>
          <span className={styles.summaryValue}>{order.wine_name}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Lote Asignado</span>
          <span className={styles.summaryValue}>{order.lot_number || 'Sin lote'}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Producción Final</span>
          <span className={styles.summaryValue}>{Number(order.quantity_produced).toLocaleString('es-ES')} botellas</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Volumen de Granel</span>
          <span className={styles.summaryValue}>{Number(order.bulk_liters_withdrawn).toFixed(2)} Litros</span>
        </div>
      </div>

      {/* 📜 DETALLE DE IMPACTO EN STOCK */}
      <div className={styles.impactBox}>
        <h4 className={styles.impactTitle}>Impacto Inmediato en Sistema:</h4>
        <ul className={styles.impactList}>
          <li>Se descontará el vino base del depósito asignado.</li>
          <li>Se descontarán envases, tapones, cápsulas y etiquetas según la receta activa del vino.</li>
          <li>Se descontarán los aditivos/insumos enológicos declarados manualmente.</li>
          <li>El estado del parte pasará a <strong>CONFIRMADO</strong> y no podrá ser modificado ni eliminado.</li>
        </ul>
      </div>

      {/* 🔘 BOTONERA DE ACCIÓN */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </FormButton>

        <FormButton
          type="button"
          variant="primary"
          onClick={onConfirm}
          isLoading={isSubmitting}
          loadingText="Ejecutando FIFO..."
        >
          🚀 Confirmar Cierre y Descontar Stock
        </FormButton>
      </div>
    </div>
  );
};