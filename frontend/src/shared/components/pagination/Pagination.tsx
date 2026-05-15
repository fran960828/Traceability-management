import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import styles from './Pagination.module.css';

interface PaginationProps {
  count: number;        // Total de registros (del backend)
  pageSize?: number;    // Registros por página (por defecto 10 en Django)
  currentPage: number;  // Página actual
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  count,
  pageSize = 10,
  currentPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(count / pageSize);

  // No renderizar nada si solo hay una página o ninguna
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className={styles.paginationContainer}>
      <div className={styles.info}>
        Mostrando <span className={styles.bold}>{(currentPage - 1) * pageSize + 1}</span> a{' '}
        <span className={styles.bold}>{Math.min(currentPage * pageSize, count)}</span> de{' '}
        <span className={styles.bold}>{count}</span> resultados
      </div>

      <div className={styles.controls}>
        <button 
          onClick={() => onPageChange(1)} 
          disabled={currentPage === 1}
          className={styles.pageBtn}
          title="Primera página"
        >
          <ChevronsLeft size={18} />
        </button>

        <button 
          onClick={handlePrevious} 
          disabled={currentPage === 1}
          className={styles.pageBtn}
          title="prev"
        >
          <ChevronLeft size={18} />
        </button>

        <span className={styles.pageIndicator}>
          Página {currentPage} de {totalPages}
        </span>

        <button 
          onClick={handleNext} 
          disabled={currentPage === totalPages}
          className={styles.pageBtn}
          title="next"
        >
          <ChevronRight size={18} />
        </button>

        <button 
          onClick={() => onPageChange(totalPages)} 
          disabled={currentPage === totalPages}
          className={styles.pageBtn}
          title="Última página"
        >
          <ChevronsRight size={18} />
        </button>
      </div>
    </div>
  );
};

