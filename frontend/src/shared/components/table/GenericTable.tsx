import React from 'react';
import styles from './GenericTable.module.css';

interface GenericTableProps {
  headers: string[];
  children: React.ReactNode; // Aquí irán las filas (SupplierRow, ProductRow...)
}

export const GenericTable: React.FC<GenericTableProps> = ({ headers, children }) => {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
            <th style={{ textAlign: 'right' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
};