import React from 'react';
import styles from './FilterDate.module.css';

interface FilterDateRangeProps {
  label: string;
  baseName: string; // Ej: "created_at" o "delivery_date"
  values: Record<string, string | number | undefined>; // Pasamos el objeto de filtros completo
  onChange: (updates: Record<string, string | number | undefined>) => void;
}

export const FilterDateRange: React.FC<FilterDateRangeProps> = ({
  label,
  baseName,
  values,
  onChange,
}) => {
  const startName = `${baseName}__gte`;
  const endName = `${baseName}__lte`;

  const startDate = values[startName] as string;
  const endDate = values[endName] as string;

  const handleDateChange = (name: string, newValue: string) => {
    const isStart = name === startName;
    const otherDate = isStart ? endDate : startDate;

    // Validación: Si ambas fechas existen, comprobar que inicio <= fin
    if (newValue && otherDate) {
      const startToCheck = isStart ? newValue : otherDate;
      const endToCheck = isStart ? otherDate : newValue;

      if (startToCheck > endToCheck) {
        // Opción A: No actualizar (ignorar cambio inválido)
        // Opción B: Podrías añadir un estado de error visual aquí
        return; 
      }
    }

    onChange({ [name]: newValue || undefined, page: 1 });
  };

  return (
    <div className={styles.filterGroup}>
      <label className={styles.label}>{label}</label>
      <div className={styles.dateRangeWrapper}>
        <input
          type="date"
          value={startDate || ''}
          onChange={(e) => handleDateChange(startName, e.target.value)}
        />
        <span className={styles.separator}>a</span>
        <input
          type="date"
          value={endDate || ''}
          onChange={(e) => handleDateChange(endName, e.target.value)}
        />
      </div>
    </div>
  );
};