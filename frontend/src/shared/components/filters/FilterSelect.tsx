import React from 'react';
import styles from './FilterSelect.module.css';

// Definimos una interfaz para las opciones para que no sea "any"
export interface SelectOption {
  id: string | number;
  name: string;
}

interface FilterSelectProps {
  label: string;
  name: string;
  value: string | number | undefined;
  options: SelectOption[];
  onChange: (updates: Record<string, string | number | undefined>) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  name,
  value,
  options,
  onChange,
  isLoading = false,
  disabled = false,
}) => {
  return (
    <div className={styles.filterGroup}>
      <label className={styles.label}>{label}</label>
      <div className={styles.selectWrapper}>
        <select
          name={name}
          className={styles.select}
          value={value || ''}
          onChange={(e) => onChange({ [name]: e.target.value, page: 1 })}
          disabled={disabled || isLoading}
        >
          <option value="">{isLoading ? 'Cargando...' : 'Todos'}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
        {/* Un pequeño indicador visual de flecha personalizado suele ir aquí con CSS */}
      </div>
    </div>
  );
};