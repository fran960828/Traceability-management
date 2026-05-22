import React from 'react';
import styles from './DataGridDetail.module.css';

export interface DetailFieldConfig {
  label: string;
  value: React.ReactNode; // Permite texto, números o JSX simple
  fullWidth?: boolean;
  isMeta?: boolean; // Para aplicar la clase .metaCard
}

interface DataGridDetailProps {
  fields: DetailFieldConfig[];
}

export const DataGridDetail: React.FC<DataGridDetailProps> = ({ fields }) => {
  return (
    <div className={styles.infoGrid}>
      {fields.map((field, index) => {
        // Construimos las clases dinámicamente según las flags
        let cardClassName = styles.infoCard;
        if (field.fullWidth) cardClassName += ` ${styles.fullWidth}`;
        if (field.isMeta) cardClassName += ` ${styles.metaCard}`;

        return (
          <div key={`${field.label}-${index}`} className={cardClassName}>
            <span className={styles.cardLabel}>{field.label}</span>
            <span className={field.isMeta ? styles.metaValue : styles.cardValue}>
              {field.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};