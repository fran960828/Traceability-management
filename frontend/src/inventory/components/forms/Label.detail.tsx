import React from 'react';
import { type LabelMaterial } from '../../models/label.schema';
import { DataGridDetail, type DetailFieldConfig } from '../../../shared/components/detailView/DataGridDetail';
import { FormButton } from '../../../shared/components/formularios/FormButton';
import styles from '../../../supplier/components/forms/Supplier.detail.module.css'; // Mantiene la consistencia de estilos

interface LabelDetailViewProps {
  labelData: LabelMaterial;
  onEditClick: (label: LabelMaterial) => void;
  onDeleteClick: (label: LabelMaterial) => void;
  onBack: () => void;
}

export const LabelDetailView: React.FC<LabelDetailViewProps> = ({
  labelData,
  onEditClick,
  onDeleteClick,
  onBack,
}) => {
  
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };
  
  const labelFields: DetailFieldConfig[] = [
    { label: 'Referencia de Marca / Vino', value: labelData.brand_reference },
    { label: 'Añada / Cosecha', value: String(labelData.vintage) },
    { label: 'Posición de Etiqueta', value: labelData.label_type_display },
    { label: 'Unidad de Medida', value: labelData.unit_mesure_display },
    { 
      label: 'Existencias Actuales', 
      value: `${labelData.current_stock} ${labelData.unit_mesure_display.toLowerCase()}` 
    },
    { 
      label: 'Nivel de Stock Mínimo', 
      value: `${labelData.min_stock_level} ${labelData.unit_mesure_display.toLowerCase()}` 
    },
    { 
      label: 'Descripción Técnica', 
      value: labelData.description || 'Sin descripción adicional.', 
      fullWidth: true 
    },
    { 
      label: 'Información de Registro', 
      value: `Dado de alta el ${formatDate(labelData.created_at)} (ID Interno: ${labelData.id})`, 
      fullWidth: true,
      isMeta: true // 🌟 Activa automáticamente el patrón metaCard de auditoría
    },
  ];

  return (
    <div className={styles.detailContainer}>
      {/* Botón superior de retorno */}
      <button type="button" onClick={onBack} className={styles.btnBack}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={styles.backIcon}>
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
        </svg>
        Volver al listado
      </button>

      {/* Cabecera */}
      <div className={styles.header}>
        <div>
          <span className={styles.categoryBadge}>Posición: {labelData.label_type_display}</span>
          <h2 className={styles.title}>Material: {labelData.name}</h2>
          <p className={styles.subtitle}>Código único de sistema: <code>{labelData.internal_code}</code></p>
        </div>
        <span className={`${styles.statusBadge} ${labelData.is_active ? styles.active : styles.inactive}`}>
          {labelData.is_active ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Renderizado automatizado del Grid */}
      <DataGridDetail fields={labelFields} />

      {/* Botonera inferior */}
      <div className={styles.actionsContainer}>
        
        {/* Botón de Eliminar (Variante Danger) */}
        <FormButton variant="danger" onClick={() => onDeleteClick(labelData)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={styles.btnIcon}>
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.006.307l-.938 1.877a.75.75 0 101.342.666l.938-1.877a.75.75 0 00-.336-1.073zm3.84.307a.75.75 0 00-1.342-.666l-.938 1.877a.75.75 0 101.342.666l.938-1.877z" clipRule="evenodd" />
          </svg>
          Eliminar Ficha
        </FormButton>

        <div className={styles.rightActions}>
          {/* Botón de Cerrar (Variante Secundaria) */}
          <FormButton variant="secondary" onClick={onBack}>
            Cerrar Ficha
          </FormButton>
          
          {/* Botón de Editar (Variante Primaria) */}
          <FormButton variant="primary" onClick={() => onEditClick(labelData)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={styles.btnIcon}>
              <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v10.5A2.75 2.75 0 004.75 19h10.5A2.75 2.75 0 0018 16.25V11a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25V5.75z" />
            </svg>
            Editar Datos
          </FormButton>
        </div>

      </div>
    </div>
  );
};