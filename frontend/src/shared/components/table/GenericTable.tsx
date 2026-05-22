import React from 'react';
import styles from './GenericTable.module.css';

interface GenericTableProps {
  headers: string[];
  children: React.ReactNode; 
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
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
};