import React from 'react';
import { Eye, Edit2, Trash2, Copy } from 'lucide-react';
import styles from './GenericTable.module.css';

interface ActionConfig {
  label?: string;
  icon: React.ElementType;
  onClick: (id: any) => void;
  className?: string;
}
interface ColumnConfig<T> {
  header: string;
  key: keyof T | 'actions';
  render?: (item: T) => React.ReactNode; // Para casos especiales como Badges
}

interface GenericRowProps<T> {
  item: T;
  columns: ColumnConfig<T>[];
  actions?: {
    view?: (item: T) => void;
    edit?: (item: T) => void;
    delete?: (item: T) => void;
    clone?: (item: T) => void;
    custom?: ActionConfig[]; // Para operaciones extra que mencionaste
  };
}

export function GenericRow<T extends { id: any }>({ 
  item, 
  columns, 
  actions 
}: GenericRowProps<T>) {
  return (
    <tr>
      {columns.map((col, index) => (
        <td key={index} className={styles.tableCell}>
          {col.render ? col.render(item) : (item[col.key as keyof T] as React.ReactNode)}
        </td>
      ))}

      {/* Celda de Acciones Dinámica */}
      <td className={styles.actionsCell}>
        {actions?.view && (
          <button className={`${styles.btnAction} ${styles.btnView}`} onClick={() => actions.view!(item)}>
            <Eye size={16} />
          </button>
        )}
        {actions?.edit && (
          <button className={`${styles.btnAction} ${styles.btnEdit}`} onClick={() => actions.edit!(item)}>
            <Edit2 size={16} />
          </button>
        )}
        {actions?.clone && (
          <button className={`${styles.btnAction} ${styles.btnClone}`} onClick={() => actions.clone!(item)}>
            <Copy size={16} />
          </button>
        )}
        {actions?.custom?.map((action, idx) => (
          <button key={idx} className={`${styles.btnAction} ${action.className}`} onClick={() => action.onClick(item.id)}>
            <action.icon size={16} />
          </button>
        ))}
        {actions?.delete && (
          <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => actions.delete!(item)}>
            <Trash2 size={16} />
          </button>
        )}
      </td>
    </tr>
  );
}