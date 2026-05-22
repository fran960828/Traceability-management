import React from 'react';
import styles from './FormReadOnlyInput.module.css';

export interface ReadOnlyField {
  label: string;
  value: string | number;
}

interface FormReadOnlyInputProps {
  fields: ReadOnlyField[];
}

export const FormReadOnlyInput: React.FC<FormReadOnlyInputProps> = ({ fields }) => {
  if (!fields || fields.length === 0) return null;

  return (
    <div className={styles.readOnlySection}>
      {fields.map((field, index) => {
        // Generamos un ID único y limpio para la vinculación (ej: id-interno-0)
        const generatedId = `${field.label.toLowerCase().replace(/\s+/g, '-')}-${index}`;

        return (
          <div key={`${field.label}-${index}`} className={styles.readOnlyGroup}>
            <label htmlFor={generatedId} className={styles.labelReadOnly}>
              {field.label}
            </label>
            <input
              id={generatedId} // 🔄 Vinculación completada
              type="text"
              value={field.value}
              disabled
              className={styles.inputDisabled}
            />
          </div>
        );
      })}
    </div>
  );
};