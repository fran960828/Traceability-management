import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import classes from "./Modal.module.css";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  showCloseButton?: boolean; // Nueva prop
}

export const Modal = ({ 
  children, 
  onClose, 
  title, 
  showCloseButton = true 
}: ModalProps) => {
  
  // 1. Gestión de efectos (Escape y Scroll)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  // 2. Selección segura del nodo del portal
  const modalRoot = document.getElementById("modal-root");
  
  if (!modalRoot) {
    console.warn("Target container 'modal-root' not found in the DOM.");
    return null;
  }

  return createPortal(
    <div 
      className={classes.overlay} 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div 
        className={classes.modal} 
        onClick={(e) => e.stopPropagation()}
      >
        <header className={classes.header}>
          {title && (
            <h3 id="modal-title" className={classes.title}>
              {title}
            </h3>
          )}
          {showCloseButton && (
            <button 
              className={classes.closeBtn} 
              onClick={onClose}
              aria-label="Cerrar modal"
            >
              <X size={24} />
            </button>
          )}
        </header>
        
        <div className={classes.content}>
          {children}
        </div>
      </div>
    </div>,
    modalRoot
  );
};