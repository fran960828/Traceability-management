import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import styles from './FilterInput.module.css';

interface FilterInputProps {
  label: string;
  name: string;
  value: string | undefined;
  onChange: (updates: Record<string, string | number | undefined>) => void;
  placeholder?: string;
  delay?: number; // Tiempo de espera en ms
}

export const FilterInput: React.FC<FilterInputProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  delay = 500,
}) => {
  // 1. Estado local para que el input sea fluido al escribir
  const [localValue, setLocalValue] = useState(value || '');

  // 2. Sincronizar el estado local si el valor de la URL cambia (ej: al limpiar filtros)
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // 3. Lógica de Debounce
  useEffect(() => {
    // Si el valor local es igual al que ya está en la URL, no hacemos nada
    if (localValue === (value || '')) return;

    const handler = setTimeout(() => {
      onChange({ [name]: localValue, page: 1 }); // Al filtrar, siempre volvemos a la página 1
    }, delay);

    // Limpiamos el timer si el usuario sigue escribiendo antes de que termine el delay
    return () => clearTimeout(handler);
  }, [localValue, name, onChange, delay, value]);

  return (
    <div className={styles.filterGroup}>
      <label className={styles.label}>{label}</label>
      <div className={styles.inputWrapper}>
        <Search className={styles.searchIcon} size={16} />
        <input
          type="text"
          className={styles.input}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder || `Buscar ${label.toLowerCase()}...`}
        />
      </div>
    </div>
  );
};